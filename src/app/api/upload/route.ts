import { NextRequest, NextResponse } from 'next/server';
import { uploadToTelegram, resolveBotMediaType } from '@/lib/telegram';
import { saveImage, generateId, getImage, rateLimit } from '@/lib/db';
import { validateCustomId, getDirectMediaExtension } from '@/lib/slugs';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
        const limitCheck = await rateLimit(`ratelimit:legacy_upload:${ip}`, 30, 60);
        if (!limitCheck.success) {
            return NextResponse.json({ error: 'Too many upload requests. Please slow down.' }, { status: 429 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as Blob;
        const customId = formData.get('customId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Limit file size to 50 MB for legacy bot API uploads
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size exceeds maximum 50 MB limit.' }, { status: 413 });
        }

        // Validate custom ID if provided before uploading
        let id: string;
        if (customId && typeof customId === 'string' && customId.trim()) {
            const validation = validateCustomId(customId);
            if (!validation.valid || !validation.sanitized) {
                return NextResponse.json({ error: validation.error || 'Invalid customId' }, { status: 400 });
            }
            id = validation.sanitized;
            const existing = await getImage(id);
            if (existing) {
                return NextResponse.json({ error: `The ID "${id}" is already taken` }, { status: 409 });
            }
        } else {
            id = generateId();
        }

        const ext = getDirectMediaExtension(file.type || 'image/jpeg');
        const fileName = `upload${ext}`;
        const mediaType = resolveBotMediaType(file.type, fileName);

        // 1. Upload to Telegram
        const telegramResult = await uploadToTelegram(file, fileName, undefined, mediaType);

        // 2. Save to DB
        await saveImage({
            id,
            telegram_file_id: telegramResult.file_id,
            created_at: Date.now(),
            metadata: {
                size: file.size,
                type: file.type || 'image/jpeg'
            }
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.get('host') ? `http://${req.headers.get('host')}` : '');

        return NextResponse.json({
            id,
            url: `${baseUrl}/i/${id}`,
            direct_url: `${baseUrl}/i/${id}${ext}`
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
