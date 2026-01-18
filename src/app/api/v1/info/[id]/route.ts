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
                created_at: record.created_at,
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
