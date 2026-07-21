import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserFolders, createFolder, deleteFolder } from '@/lib/db';

// Returns all folders created by the logged in user
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Please log in to view folders' }, { status: 401 });
    }

    try {
        const folders = await getUserFolders(session.user.id);
        return NextResponse.json({ folders });
    } catch (error) {
        console.error('Failed to get user folders:', error);
        return NextResponse.json({ error: 'Failed to retrieve folders' }, { status: 500 });
    }
}

// Creates a new folder for the user
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Please log in to create a folder' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Please enter a valid folder name' }, { status: 400 });
        }

        const success = await createFolder(session.user.id, name.trim());
        if (!success) {
            return NextResponse.json({ error: 'Could not create folder' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Created folder "${name.trim()}"` });
    } catch (error) {
        console.error('Failed to create folder:', error);
        return NextResponse.json({ error: 'Server error while creating folder' }, { status: 500 });
    }
}

// Deletes a folder from the user's saved folders list
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Please log in to delete a folder' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Please specify a folder to delete' }, { status: 400 });
        }

        const success = await deleteFolder(session.user.id, name.trim());
        if (!success) {
            return NextResponse.json({ error: 'Could not delete folder' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Deleted folder "${name.trim()}"` });
    } catch (error) {
        console.error('Failed to delete folder:', error);
        return NextResponse.json({ error: 'Server error while deleting folder' }, { status: 500 });
    }
}
