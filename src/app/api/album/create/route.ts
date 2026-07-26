import { NextRequest, NextResponse } from 'next/server';
import { saveAlbum, generateId } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { imageIds, title, password, customId, expiresIn } = await req.json();

        if (!Array.isArray(imageIds) || imageIds.length === 0) {
            return NextResponse.json({ error: 'At least 1 file is required to create an album' }, { status: 400 });
        }

        const id = customId
            ? customId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
            : generateId();

        const password_hash = password
            ? crypto.createHash('sha256').update(password.trim()).digest('hex')
            : undefined;

        const album = await saveAlbum(
            {
                id,
                title: title?.trim() || 'Shared Album',
                image_ids: imageIds,
                created_at: Date.now(),
                password_hash,
            },
            expiresIn ? parseInt(expiresIn, 10) : undefined
        );

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.get('host') ? `http://${req.headers.get('host')}` : '');

        return NextResponse.json({
            success: true,
            id: album.id,
            url: `${baseUrl}/album/${album.id}`,
            count: imageIds.length,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to create album' }, { status: 500 });
    }
}
