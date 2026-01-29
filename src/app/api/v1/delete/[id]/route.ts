import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteImage, getImage } from '@/lib/db';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ 
            success: false, 
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
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

        // Delete the image
        const success = await deleteImage(id, session.user.id);

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
