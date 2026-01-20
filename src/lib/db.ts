
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

export async function saveImage(record: any, source: 'web' | 'bot' = 'web', userId?: string | number) {
    if (useCloud() && redis) {
        // Use HSET to store as a single Hash object in Redis
        const pipeline = redis.pipeline();
        pipeline.hset(`snap:${record.id}`, {
            ...record,
            views: 0,
            metadata: JSON.stringify(record.metadata)
        });

        // 1. Total Uploads
        pipeline.incr('stats:total_uploads');

        // 2. Source specific stats
        // 2. Source specific stats
        if (source === 'web') {
            pipeline.incr('stats:web_uploads');
        } else if (source === 'bot') {
            pipeline.incr('stats:bot_uploads');
            if (userId) {
                // 3. Unique Users (only for bot users usually)
                pipeline.sadd('stats:users', userId);
            }
        }

        // 3. Media Type stats
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
    // Local DB stats not really needed as this is mostly for the bot which runs with Redis
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
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
        await redis.sadd('stats:users', userId);
    }
}
