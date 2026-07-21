import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateImageOrganization } from '@/lib/db';

// Allows logged-in users to update the folder and tags for their uploads
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Please log in to organize your files' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, folder, tags } = body;

        if (!id || typeof id !== 'string') {
            return NextResponse.json({ error: 'Valid file ID is required' }, { status: 400 });
        }

        // Apply folder and tags update to the file in the database
        const success = await updateImageOrganization(
            id,
            session.user.id,
            typeof folder === 'string' ? folder : undefined,
            Array.isArray(tags) ? tags : undefined
        );

        if (!success) {
            return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Updated folder and tags' });
    } catch (error) {
        console.error('Failed to organize upload:', error);
        return NextResponse.json({ error: 'Server error while updating organization' }, { status: 500 });
    }
}
