import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserUploads, verifyApiKey } from '@/lib/db';

export async function GET(req: NextRequest) {
    let userId: string | undefined;

    // Try session auth first
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        userId = session.user.id;
    }

    // Fall back to API key auth
    if (!userId) {
        const apiKey =
            req.headers.get('x-api-key') ||
            req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

        if (apiKey) {
            const keyUserId = await verifyApiKey(apiKey);
            if (keyUserId) userId = keyUserId;
        }
    }

    if (!userId) {
        return NextResponse.json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required. Use a session cookie or X-API-Key header.',
            },
        }, { status: 401 });
    }

    try {
        const uploads = await getUserUploads(userId);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

        return NextResponse.json({
            success: true,
            data: {
                count: uploads.length,
                uploads: uploads.map((u) => ({
                    id: u.id,
                    url: `${baseUrl}/i/${u.id}`,
                    direct_url: `${baseUrl}/i/${u.id}.${u.metadata?.type?.startsWith('video/') ? 'mp4' : 'jpg'}`,
                    views: u.views,
                    downloads: u.downloads,
                    created_at: u.created_at,
                    expires_at: u.expires_at ?? null,
                    metadata: {
                        size: u.metadata?.size,
                        type: u.metadata?.type,
                    },
                })),
            },
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message },
        }, { status: 500 });
    }
}
