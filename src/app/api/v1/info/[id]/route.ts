import { NextRequest, NextResponse } from 'next/server';
import { getImage, rateLimit } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const limit = await rateLimit(`info:${ip}`, 60, 60);

    if (!limit.success) {
        return NextResponse.json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many uploads. Try again in ${limit.remaining === 0 ? 'a minute' : 'a moment'}.`
            }
        }, {
            status: 429,
            headers: {
                'X-RateLimit-Limit': (limit.limit ?? 10).toString(),
                'X-RateLimit-Remaining': (limit.remaining ?? 0).toString()
            }
        });
    }

    const { id } = await params;

    try {
        const record = await getImage(id);

        if (!record) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Image record not found' }
            }, { status: 404 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.get('host') ? `http://${req.headers.get('host')}` : '');

        return NextResponse.json({
            success: true,
            data: {
                id: record.id,
                url: `${baseUrl}/i/${record.id}`,
                direct_url: `${baseUrl}/i/${record.id}.jpg`,
                views: record.views,
                is_protected: !!record.password_hash,
                created_at: record.created_at,
                expires_at: record.expires_at ?? null,
                metadata: record.metadata
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await req.json();
        const { password } = body;

        if (!password || typeof password !== 'string') {
            return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
        }

        const record = await getImage(id);
        if (!record) {
            return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
        }

        if (!record.password_hash) {
            return NextResponse.json({ success: true, message: 'Link is not password protected' });
        }

        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(password.trim()).digest('hex');

        if (hash !== record.password_hash) {
            return NextResponse.json({ success: false, error: 'Incorrect secret PIN/password' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true, token: hash, message: 'Unlocked successfully' });
        response.cookies.set(`pe_pass_${id}`, hash, {
            path: '/',
            maxAge: 86400,
            sameSite: 'lax',
            httpOnly: false
        });
        return response;
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || 'Unlock error' }, { status: 500 });
    }
}
