import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserUploads } from '@/lib/db';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const uploads = await getUserUploads(session.user.id);
        const sanitizedUploads = uploads.map(u => ({
            id: u.id,
            created_at: u.created_at,
            expires_at: u.expires_at ?? null,
            views: u.views,
            downloads: u.downloads,
            folder: u.folder || '',
            tags: Array.isArray(u.tags) ? u.tags : [],
            burn_after_view: !!u.burn_after_view,
            burn_after_download: !!u.burn_after_download,
            password_hash: u.password_hash || undefined,
            metadata: u.metadata
        }));
        return NextResponse.json({ uploads: sanitizedUploads });
    } catch (error) {
        console.error('Failed to fetch user uploads:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
