import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

export async function GET() {
    try {
        const stats = await getStats();
        return NextResponse.json(
            { success: true, data: stats },
            {
                headers: {
                    // Cache for 30 seconds at the edge to avoid hammering Redis
                    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
                },
            }
        );
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: { message: error.message } },
            { status: 500 }
        );
    }
}
