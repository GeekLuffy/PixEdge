import { NextRequest, NextResponse } from 'next/server';
import { saveAlbum, generateId, getAlbum, rateLimit } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
        const limitResult = await rateLimit(`ratelimit:album_create:${ip}`, 30, 3600);
        if (!limitResult.success) {
            return NextResponse.json(
                { error: 'Too many albums created. Please try again later.' },
                { status: 429 }
            );
        }

        const { imageIds, title, password, customId, expiresIn } = await req.json();

        if (!Array.isArray(imageIds) || imageIds.length === 0) {
            return NextResponse.json({ error: 'At least 1 file is required to create an album' }, { status: 400 });
        }

        if (imageIds.length > 100) {
            return NextResponse.json({ error: 'Albums cannot contain more than 100 files' }, { status: 400 });
        }

        const validImageIds = imageIds
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            .map(id => id.trim());

        if (validImageIds.length === 0) {
            return NextResponse.json({ error: 'Valid file IDs are required' }, { status: 400 });
        }

        let id: string;
        if (customId && typeof customId === 'string') {
            id = customId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
            if (!id || id.length < 3 || id.length > 64) {
                return NextResponse.json({ error: 'Invalid customId. It must be between 3 and 64 alphanumeric characters.' }, { status: 400 });
            }
            const existing = await getAlbum(id);
            if (existing) {
                return NextResponse.json({ error: `The Album ID "${id}" is already taken` }, { status: 409 });
            }
        } else {
            id = generateId();
        }

        const password_hash = password && typeof password === 'string' && password.trim()
            ? crypto.createHash('sha256').update(password.trim()).digest('hex')
            : undefined;

        const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 200) : 'Shared Album';
        const parsedExpiry = expiresIn ? parseInt(expiresIn, 10) : undefined;
        const validExpiry = parsedExpiry && !isNaN(parsedExpiry) && parsedExpiry > 0 ? parsedExpiry : undefined;

        const album = await saveAlbum(
            {
                id,
                title: cleanTitle || 'Shared Album',
                image_ids: validImageIds,
                created_at: Date.now(),
                password_hash,
            },
            validExpiry
        );

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.get('host') ? `http://${req.headers.get('host')}` : '');

        return NextResponse.json({
            success: true,
            id: album.id,
            url: `${baseUrl}/album/${album.id}`,
            count: validImageIds.length,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to create album' }, { status: 500 });
    }
}
