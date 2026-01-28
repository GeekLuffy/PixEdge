import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyLinkToken, linkTelegramToAccount, getLinkedTelegram } from '@/lib/db';

// GET - Check link status
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const linkedTelegram = await getLinkedTelegram(session.user.id);
    return NextResponse.json({
        linked: !!linkedTelegram,
        telegramId: linkedTelegram
    });
}

// POST - Link Telegram account using token
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        const telegramId = await verifyLinkToken(token);
        if (!telegramId) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        await linkTelegramToAccount(telegramId, session.user.id);

        return NextResponse.json({
            success: true,
            message: 'Telegram account linked successfully',
            telegramId
        });
    } catch (error: any) {
        console.error('Link error:', error);
        return NextResponse.json({ error: error.message || 'Link failed' }, { status: 500 });
    }
}
