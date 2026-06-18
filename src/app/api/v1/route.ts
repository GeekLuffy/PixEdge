import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        success: true,
        version: 'v1.0.0',
        status: 'stable',
        documentation: '/docs',
        endpoints: {
            upload: 'POST /api/v1/upload',
            info: 'GET /api/v1/info/[id]',
            list: 'GET /api/v1/list',
            delete: 'DELETE /api/v1/delete/[id]',
        },
        auth: 'Pass your API key via the X-API-Key header or Authorization: Bearer <key>.',
        sharex: 'GET /api/sharex?key=<api_key> — download a ready-to-use ShareX .sxcu config.',
        stats: 'GET /api/stats — public platform statistics.',
        message: 'PixEdge API v1 is active. Refer to /docs for full integration details.'
    });
}
