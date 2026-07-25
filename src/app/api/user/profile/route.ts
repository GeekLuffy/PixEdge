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
        const { name, image } = body;

        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });

        const userId = session.user.id;
        const userKey = `user:${userId}`;
        const user: any = await redis.get(userKey);
        const customAvatar: string | null = await redis.get(`user:custom_avatar:${userId}`);

        return NextResponse.json({
            success: true,
            user: {
                ...user,
                image: customAvatar || user?.image || session.user.image
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}
