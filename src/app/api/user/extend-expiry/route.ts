import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extendImageExpiry, verifyApiKey } from '@/lib/db';

// Resolve userId from session or API Key
async function resolveUserId(req: NextRequest): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;

    const apiKey =
        req.headers.get('x-api-key') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (apiKey) {
        return await verifyApiKey(apiKey);
    }
    return null;
}

export async function POST(req: NextRequest) {
    const userId = (await resolveUserId(req)) || undefined;

    try {
        const body = await req.json();
        const { id, durationSeconds } = body;

        if (!id || typeof durationSeconds !== 'number') {
            return NextResponse.json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: 'Upload id and numeric durationSeconds are required.' }
            }, { status: 400 });
        }

        const result = await extendImageExpiry(id, userId, durationSeconds);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: { code: 'EXTEND_FAILED', message: result.error || 'Failed to extend expiry.' }
            }, { status: result.error?.includes('owner') ? 401 : 400 });
        }

        return NextResponse.json({
            success: true,
            newExpiresAt: result.newExpiresAt,
            message: durationSeconds === -1 ? 'Upload link set to never expire!' : 'Expiry extended successfully!'
        });
    } catch (error: any) {
        console.error('Extend expiry API error:', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message || 'Server error' }
        }, { status: 500 });
    }
}
