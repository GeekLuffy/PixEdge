import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        let { name, image } = body;

        // Validation & sanitization against XSS, SSRF & Bot Token Leakage
        if (image !== undefined && image !== null) {
            if (typeof image !== 'string' || image.length > 2048) {
                return NextResponse.json({ error: 'Invalid image format or length exceeds 2048 characters' }, { status: 400 });
            }
            const cleanImage = image.trim();
            if (
                cleanImage.includes('api.telegram.org/file/bot') ||
                cleanImage.toLowerCase().startsWith('javascript:') ||
                cleanImage.toLowerCase().startsWith('data:') ||
                cleanImage.toLowerCase().startsWith('vbscript:') ||
                (!cleanImage.startsWith('http://') && !cleanImage.startsWith('https://') && !cleanImage.startsWith('/'))
            ) {
                return NextResponse.json({ error: 'Unsafe or prohibited avatar URL' }, { status: 400 });
            }
            image = cleanImage;
        }

        if (name !== undefined && name !== null) {
            if (typeof name !== 'string' || name.length > 64) {
                return NextResponse.json({ error: 'Name must be 64 characters or less' }, { status: 400 });
            }
            name = name.trim().replace(/[<>]/g, '');
        }

        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
            token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
        });

        const userId = session.user.id;
        const userKey = `user:${userId}`;

        const existing: any = (await redis.get(userKey)) || {};
        const updated = {
            ...existing,
            name: name ?? existing.name ?? session.user.name,
            image: image ?? existing.image ?? session.user.image,
            updatedAt: Date.now(),
        };

        await redis.set(userKey, updated);
        if (image) {
            await redis.set(`user:custom_avatar:${userId}`, image);
        }

        return NextResponse.json({
            success: true,
            user: updated,
            message: 'Profile picture & account settings updated!'
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to update profile' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
            token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
        });

        const userId = session.user.id;
        const userKey = `user:${userId}`;
        const user: any = await redis.get(userKey);
        let customAvatar: string | null = await redis.get(`user:custom_avatar:${userId}`);

        // Purge leaked bot token if previously stored
        if (customAvatar && customAvatar.includes('api.telegram.org/file/bot')) {
            await redis.del(`user:custom_avatar:${userId}`);
            customAvatar = null;
        }

        const rawImage = customAvatar || user?.image || session.user.image;
        const safeImage = (rawImage && !rawImage.includes('api.telegram.org/file/bot')) ? rawImage : null;

        return NextResponse.json({
            success: true,
            user: {
                ...user,
                image: safeImage
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}
