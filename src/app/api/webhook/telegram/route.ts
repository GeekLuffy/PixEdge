import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, sendMessage } from '@/lib/telegram';
import { saveImage, generateId } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body: TelegramUpdate = await req.json();

        if (!body.message) {
            return new NextResponse('OK');
        }

        const chatId = body.message.chat.id;
        const text = body.message.text;
        const photo = body.message.photo;
        const document = body.message.document;

        // Handle commands
        if (text) {
            if (text === '/start') {
                await sendMessage(chatId,
                    `<b>Welcome to PixEdge Bot!</b>\n\n` +
                    `I can host your images at the edge. Just send me any photo or document (as image).\n\n` +
                    `<b>Commands:</b>\n` +
                    `/upload - Instructions\n` +
                    `/tgm - Instructions`
                );
                return new NextResponse('OK');
            }

            if (text === '/upload' || text === '/tgm') {
                await sendMessage(chatId,
                    `<b>How to Upload:</b>\n\n` +
                    `1. Directly send a photo to this bot.\n` +
                    `2. Or send an image as a "File/Document".\n\n` +
                    `I will instantly return a high-speed PixEdge link!`
                );
                return new NextResponse('OK');
            }

            // Fallback for unknown text
            await sendMessage(chatId,
                `❓ <b>I'm not sure what you mean.</b>\n\n` +
                `Just send me any <b>Photo</b> or <b>Image File</b> and I will host it for you instantly!`,
                'HTML'
            );
            return new NextResponse('OK');
        }

        // Handle Photo
        if (photo && photo.length > 0) {
            const largestPhoto = photo[photo.length - 1];
            await processFile(chatId, largestPhoto.file_id, largestPhoto.file_size, 'image/jpeg');
            return new NextResponse('OK');
        }

        // Handle Document (only if it's an image)
        if (document) {
            const mimeType = document.mime_type || '';
            if (mimeType.startsWith('image/')) {
                await processFile(chatId, document.file_id, document.file_size, mimeType);
            } else {
                await sendMessage(chatId, "❌ Please send only image files.");
            }
            return new NextResponse('OK');
        }

        return new NextResponse('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        return new NextResponse('OK'); // Always return OK to Telegram
    }
}

async function processFile(chatId: number, fileId: string, fileSize: number, mimeType: string) {
    try {
        const id = generateId();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        await saveImage({
            id,
            telegram_file_id: fileId,
            created_at: Date.now(),
            metadata: {
                size: fileSize,
                type: mimeType
            }
        });

        const publicUrl = `${baseUrl}/i/${id}`;

        await sendMessage(chatId,
            `✅ <b>File Uploaded Successfully!</b>\n\n` +
            `🔗 <b>Link:</b> ${publicUrl}\n` +
            `⚡ <i>Hosted on PixEdge</i>`,
            'HTML'
        );
    } catch (error) {
        console.error('Processing error:', error);
        await sendMessage(chatId, "❌ Failed to process your image. Please try again later.");
    }
}
