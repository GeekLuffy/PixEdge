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
        return NextResponse.json({ uploads });
    } catch (error) {
        console.error('Failed to fetch user uploads:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
