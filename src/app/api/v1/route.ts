import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        success: true,
        version: 'v1.0.0',
        status: 'stable',
        documentation: '/docs',
        endpoints: {
            upload: '/api/v1/upload',
            info: '/api/v1/info/[id]'
        },
        message: 'PixEdge API v1 is active. Please refer to /docs for full integration details.'
    });
}
