import { NextRequest, NextResponse } from 'next/server';
import { getAlbum, getImage, incrementAlbumViews } from '@/lib/db';
import crypto from 'crypto';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const album = await getAlbum(id);

        if (!album) {
            return NextResponse.json({ error: 'Album not found or expired' }, { status: 404 });
        }

        // Check password protection
        if (album.password_hash) {
            const clientPass = req.headers.get('x-album-password') || req.nextUrl.searchParams.get('p');
            if (!clientPass) {
                return NextResponse.json({ isLocked: true, title: album.title, count: album.image_ids.length }, { status: 401 });
            }

            const clientHash = crypto.createHash('sha256').update(clientPass.trim()).digest('hex');
            if (clientHash !== album.password_hash) {
                return NextResponse.json({ error: 'Incorrect PIN or password', isLocked: true }, { status: 401 });
            }
        }

        // Increment view count
        await incrementAlbumViews(id);

        // Fetch image records for each image ID in album
        const items = await Promise.all(
            album.image_ids.map(async (imageId) => {
                const img = await getImage(imageId);
                if (!img) return null;
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    (req.headers.get('host') ? `http://${req.headers.get('host')}` : '');
                return {
                    id: img.id,
                    url: `${baseUrl}/i/${img.id}`,
                    direct_url: `${baseUrl}/api/v1/info/${img.id}`,
                    type: img.metadata?.type || 'image/jpeg',
                    size: img.metadata?.size || 0,
                    created_at: img.created_at,
                };
            })
        );

        const validItems = items.filter(Boolean);

        return NextResponse.json({
            id: album.id,
            title: album.title || 'Shared Album',
            created_at: album.created_at,
            views: album.views + 1,
            items: validItems,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to fetch album' }, { status: 500 });
    }
}
