import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteImage, getImage, verifyApiKey } from '@/lib/db';

// Resolve userId from session OR X-API-Key / Authorization header
async function resolveUserId(req: NextRequest): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;

    const apiKey =
        req.headers.get('x-api-key') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        req.nextUrl.searchParams.get('key');

    if (apiKey) {
        return await verifyApiKey(apiKey);
    }
    return null;
}

// Reject GET to prevent CSRF cross-origin state-changing deletions via <img> or <a> tags
export async function GET() {
    return NextResponse.json({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'GET is not allowed for resource deletion. Please use DELETE.' }
    }, { status: 405 });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await resolveUserId(req);
    if (!userId) {
        return NextResponse.json({ 
            success: false, 
            error: { code: 'UNAUTHORIZED', message: 'Authentication required. Use session or X-API-Key header.' } 
        }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Check if image exists
        const image = await getImage(id);
        if (!image) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Image not found' }
            }, { status: 404 });
        }

        // Delete the image (deleteImage enforces ownership internally)
        const success = await deleteImage(id, userId);

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            return NextResponse.json({
                success: false,
                error: { code: 'DELETE_FAILED', message: 'Failed to delete image' }
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Delete error:', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message || 'Server error' }
        }, { status: 500 });
    }
}
