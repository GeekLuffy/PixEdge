import { NextRequest, NextResponse } from 'next/server';
import { getImage } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const record = await getImage(id);

        if (!record) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        if (record.password_hash) {
            const cookiePass = req.cookies.get(`pe_pass_${id}`)?.value;
            const queryPass = req.nextUrl.searchParams.get('password') || req.nextUrl.searchParams.get('pass');
            const headerPass = req.headers.get('x-media-password');
            const candidate = queryPass || headerPass || '';

            let authorized = false;
            if (cookiePass && cookiePass === record.password_hash) {
                authorized = true;
            } else if (candidate) {
                const crypto = await import('crypto');
                const candHash = crypto.createHash('sha256').update(candidate.trim()).digest('hex');
                if (candHash === record.password_hash) {
                    authorized = true;
                }
            }

            if (!authorized) {
                return NextResponse.json({ error: 'Unauthorized: Password protected link', is_protected: true }, { status: 401 });
            }
        }

        return NextResponse.json({
            id: record.id,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/i/${record.id}`,
            direct_url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/i/${record.id}.jpg`,
            views: record.views,
            created_at: record.created_at,
            metadata: record.metadata
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
