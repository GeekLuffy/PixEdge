
import fs from 'fs/promises';
import path from 'path';
import { Redis } from '@upstash/redis';

const DB_PATH = path.join(process.cwd(), 'db.json');

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

const useCloud = () => !!redis;

export interface ImageRecord {
    id: string;
    telegram_file_id: string;
    created_at: number;
    views: number;
    metadata: {
        size: number;
        type: string;
    };
}

async function ensureLocalDb() {
    try {
        await fs.access(DB_PATH);
    } catch {
        await fs.writeFile(DB_PATH, JSON.stringify({ images: [] }));
    }
}

export async function saveImage(record: Omit<ImageRecord, 'views'>, source: 'web' | 'bot' = 'web', userId?: string | number) {
    if (useCloud() && redis) {
        const pipeline = redis.pipeline();
        pipeline.hset(`snap:${record.id}`, {
            ...record,
            views: 0,
            metadata: JSON.stringify(record.metadata)
        });

        // 1. Total Uploads
        pipeline.incr('stats:total_uploads');

        // 2. Source specific stats
        if (source === 'web') {
            pipeline.incr('stats:web_uploads');
        } else {
            pipeline.incr('stats:bot_uploads');
        }

        // 3. User specific tracking
        if (userId) {
            pipeline.sadd('stats:users', userId.toString());
            pipeline.lpush(`user:${userId}:uploads`, record.id);
            pipeline.ltrim(`user:${userId}:uploads`, 0, 49); // Keep last 50
        }

        // 4. Media Type stats
        const type = record.metadata.type || '';
        if (type.startsWith('video/') || type === 'image/gif') {
            pipeline.incr('stats:videos');
        } else {
            pipeline.incr('stats:images');
        }

        await pipeline.exec();
        return;
    }

    await ensureLocalDb();
    const content = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(content);
    db.images.push({ ...record, views: 0 });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function getUserUploads(userId: string): Promise<ImageRecord[]> {
    if (!redis) return [];

    const ids = await redis.lrange(`user:${userId}:uploads`, 0, 49);
    if (!ids || ids.length === 0) return [];

    const results = await Promise.all(ids.map(id => redis.hgetall(`snap:${id}`)));

    return results
        .map((data: any, index) => {
            if (!data || Object.keys(data).length === 0) return null;
            return {
                ...data,
                id: ids[index],
                views: parseInt(data.views || '0'),
                created_at: parseInt(data.created_at),
                metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
            } as ImageRecord;
        })
        .filter((item): item is ImageRecord => item !== null);
}

export async function getStats() {
    if (useCloud() && redis) {
        const start = Date.now();
        const [totalUploads, totalUsers, webUploads, botUploads, totalImages, totalVideos] = await Promise.all([
            redis.get('stats:total_uploads'),
            redis.scard('stats:users'),
            redis.get('stats:web_uploads'),
            redis.get('stats:bot_uploads'),
            redis.get('stats:images'),
            redis.get('stats:videos')
        ]);
        const ping = Date.now() - start;

        return {
            totalUploads: parseInt(totalUploads as string || '0'),
            totalUsers: totalUsers || 0,
            webUploads: parseInt(webUploads as string || '0'),
            botUploads: parseInt(botUploads as string || '0'),
            totalImages: parseInt(totalImages as string || '0'),
            totalVideos: parseInt(totalVideos as string || '0'),
            ping
        };
    }
    return {
        totalUploads: 0,
        totalUsers: 0,
        webUploads: 0,
        botUploads: 0,
        totalImages: 0,
        totalVideos: 0,
        ping: 0
    };
}

export async function getImage(id: string): Promise<ImageRecord | null> {
    if (useCloud() && redis) {
        // Increment views and get data from the SAME hash object
        await redis.hincrby(`snap:${id}`, 'views', 1);
        const data: any = await redis.hgetall(`snap:${id}`);

        if (!data || Object.keys(data).length === 0) return null;

        return {
            ...data,
            id,
            views: parseInt(data.views || '0'),
            created_at: parseInt(data.created_at),
            metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
        } as ImageRecord;
    }

    try {
        await ensureLocalDb();
        const content = await fs.readFile(DB_PATH, 'utf-8');
        const db = JSON.parse(content);
        const index = db.images.findIndex((img: any) => img.id === id);
        if (index !== -1) {
            db.images[index].views = (db.images[index].views || 0) + 1;
            await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
            return db.images[index];
        }
        return null;
    } catch {
        return null;
    }
}

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
    if (!redis) return { success: true, count: 0 };

    const fullKey = `ratelimit:${key}`;
    const count = await redis.incr(fullKey);

    if (count === 1) {
        await redis.expire(fullKey, windowSeconds);
    }

    return {
        success: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        count
    };
}

export function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

export async function registerUser(userId: string | number) {
    if (useCloud() && redis) {
        await redis.sadd('stats:users', userId.toString());
    }
}

export async function idExists(id: string): Promise<boolean> {
    if (useCloud() && redis) {
        const exists = await redis.exists(`snap:${id}`);
        return exists === 1;
    }

    try {
        await ensureLocalDb();
        const content = await fs.readFile(DB_PATH, 'utf-8');
        const db = JSON.parse(content);
        return db.images.some((img: any) => img.id === id);
    } catch {
        return false;
    }
}

export async function generateIdSuggestions(baseId: string): Promise<string[]> {
    const suggestions: string[] = [];
    const sanitized = baseId.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    for (let i = 1; i <= 5; i++) {
        const suggestion = `${sanitized}-${i}`;
        if (!(await idExists(suggestion))) {
            suggestions.push(suggestion);
            if (suggestions.length >= 3) break;
        }
    }
    while (suggestions.length < 3) {
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const suggestion = `${sanitized}-${randomSuffix}`;
        if (!(await idExists(suggestion))) {
            suggestions.push(suggestion);
        }
    }

    return suggestions;
}

export async function createApiKey(userId: string): Promise<string> {
    if (!redis) throw new Error('Redis not configured');
    const key = `pe_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    await redis.set(`apikey:${key}`, userId);
    await redis.set(`user:${userId}:apikey`, key);
    return key;
}

export async function getUserApiKey(userId: string): Promise<string | null> {
    if (!redis) return null;
    return await redis.get(`user:${userId}:apikey`);
}

export async function verifyApiKey(key: string): Promise<string | null> {
    if (!redis) return null;
    return await redis.get(`apikey:${key}`);
}

// Telegram account linking functions
export async function createLinkToken(telegramId: string | number): Promise<string> {
    if (!redis) throw new Error('Redis not configured');
    const token = Math.random().toString(36).substring(2, 10);
    // Store token -> telegramId mapping (expires in 5 minutes)
    await redis.set(`link_token:${token}`, telegramId.toString(), { ex: 300 });
    return token;
}

export async function verifyLinkToken(token: string): Promise<string | null> {
    if (!redis) return null;
    const telegramId = await redis.get(`link_token:${token}`);
    if (telegramId) {
        await redis.del(`link_token:${token}`); // One-time use
    }
    return telegramId as string | null;
}

export async function linkTelegramToAccount(telegramId: string, webUserId: string): Promise<void> {
    if (!redis) return;
    // Bidirectional mapping
    await redis.set(`telegram_link:${telegramId}`, webUserId);
    await redis.set(`web_link:${webUserId}`, telegramId);
}

export async function getLinkedWebAccount(telegramId: string | number): Promise<string | null> {
    if (!redis) return null;
    return await redis.get(`telegram_link:${telegramId.toString()}`);
}

export async function getLinkedTelegram(webUserId: string): Promise<string | null> {
    if (!redis) return null;
    return await redis.get(`web_link:${webUserId}`);
}

export async function isAccountLinked(telegramId: string | number): Promise<boolean> {
    if (!redis) return false;
    const linked = await redis.exists(`telegram_link:${telegramId.toString()}`);
    return linked === 1;
}

export async function unlinkTelegramAccount(telegramId: string | number): Promise<boolean> {
    if (!redis) return false;
    const webUserId = await redis.get(`telegram_link:${telegramId.toString()}`);
    if (webUserId) {
        await redis.del(`telegram_link:${telegramId.toString()}`);
        await redis.del(`web_link:${webUserId}`);
        return true;
    }
    return false;
}
