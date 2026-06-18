import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/db';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('key');

    if (!apiKey) {
        return NextResponse.json(
            { error: 'API key required. Generate one in your dashboard at /dashboard.' },
            { status: 400 }
        );
    }

    // Verify the key exists
    const userId = await verifyApiKey(apiKey);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';

    const config = {
        Version: '14.1.0',
        Name: 'PixEdge',
        DestinationType: 'ImageUploader, FileUploader',
        RequestMethod: 'POST',
        RequestURL: `${baseUrl}/api/v1/upload`,
        Headers: {
            'X-API-Key': apiKey,
        },
        Body: 'MultipartFormData',
        FileFormName: 'file',
        URL: '$json:data.url$',
        ThumbnailURL: '$json:data.direct_url$',
        DeletionURL: `${baseUrl}/api/v1/delete/$json:data.id$`,
        ErrorMessage: '$json:error.message$',
    };

    return new NextResponse(JSON.stringify(config, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="PixEdge.sxcu"',
        },
    });
}
