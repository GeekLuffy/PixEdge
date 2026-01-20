import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, sendMessage, sendPhotoToChannel } from '@/lib/telegram';
import { saveImage, generateId, getStats, registerUser } from '@/lib/db';

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
        const replyTo = body.message.reply_to_message;
        const from = body.message.from;
        const userLink = from.username
            ? `@${from.username}`
            : `${from.first_name} [${from.id}]`;

        // Handle commands
        if (text) {
            // Support commands with @BotName suffix
            const command = text.split(' ')[0].split('@')[0].toLowerCase();

            if (command === '/start' || command === '/help') {
                if (command === '/start') {
                    await registerUser(from.id);
                }

                await sendMessage(chatId,
                    `✨ <b>PixEdge Bot Help</b>\n\n` +
                    `I can host your images at lightning speed using our edge infrastructure.\n\n` +
                    `🚀 <b>How to Upload:</b>\n` +
                    `• Send a <b>Photo</b> directly to me.\n` +
                    `• Send an image as a <b>Document</b>.\n` +
                    `• Or <b>Reply</b> to an existing image with /upload or /tgm.\n\n` +
                    `<b>Commands:</b>\n` +
                    `/stats - Show bot statistics\n` +
                    `/upload or /tgm - Upload a replied image\n` +
                    `/help - Show this message`,
                    'HTML',
                    {
                        inline_keyboard: [[
                            { text: "🌐 Visit Website", url: "https://pixedge.vercel.app" }
                        ]]
                    }
                );
                return new NextResponse('OK');
            }

            if (command === '/stats') {
                const stats = await getStats();
                await sendMessage(chatId,
                    `📊 <b>PixEdge Statistics</b>\n\n` +
                    `👥 <b>Total Users:</b> ${stats.totalUsers}\n` +
                    `🖼️ <b>Total Images:</b> ${stats.totalUploads}\n` +
                    `🤖 <b>Bot Uploads:</b> ${stats.botUploads}\n` +
                    `🌐 <b>Web Uploads:</b> ${stats.webUploads}\n` +
                    `📶 <b>Ping:</b> ${stats.ping}ms`,
                    'HTML'
                );
                return new NextResponse('OK');
            }

            if (command === '/upload' || command === '/tgm') {
                // Check if it's a reply to an image
                if (replyTo) {
                    if (replyTo.photo && replyTo.photo.length > 0) {
                        const largestPhoto = replyTo.photo[replyTo.photo.length - 1];
                        await processFile(chatId, largestPhoto.file_id, largestPhoto.file_size, 'image/jpeg', userLink, from.id);
                        return new NextResponse('OK');
                    }
                    if (replyTo.document && replyTo.document.mime_type?.startsWith('image/')) {
                        await processFile(chatId, replyTo.document.file_id, replyTo.document.file_size, replyTo.document.mime_type, userLink, from.id);
                        return new NextResponse('OK');
                    }
                }

                // If not a reply, show instructions
                await sendMessage(chatId,
                    `<b>PixEdge Upload Mode:</b>\n\n` +
                    `1. Directly send a photo to this bot.\n` +
                    `2. Or send an image as a "File/Document".\n` +
                    `3. Or <b>reply</b> to an image with /upload.\n\n` +
                    `I will instantly return a high-speed PixEdge link!`
                );
                return new NextResponse('OK');
            }

            // Fallback for unknown text
            if (body.message.chat.type === 'private') {
                await sendMessage(chatId,
                    `❓ <b>I'm not sure what you mean.</b>\n\n` +
                    `Just send me any <b>Photo</b> or <b>Image File</b> and I will host it for you instantly! Or type /help for commands.`,
                    'HTML'
                );
            }
            return new NextResponse('OK');
        }


        // Handle Photo
        // Handle Photo
        if (photo && photo.length > 0) {
            // In groups, only process if it's not a direct message (unless bot privacy is off, but we want to ignore spam)
            // Actually, per user request: "in group it should only upload when replied a photo with command"
            // So we should IGNORE all direct photos in groups.
            if (body.message.chat.type === 'private') {
                const largestPhoto = photo[photo.length - 1];
                await processFile(chatId, largestPhoto.file_id, largestPhoto.file_size, 'image/jpeg', userLink, from.id);
            }
            return new NextResponse('OK');
        }

        // Handle Document (only if it's an image)
        if (document) {
            // Only process direct documents in PRIVATE chats
            if (body.message.chat.type === 'private') {
                const mimeType = document.mime_type || '';
                if (mimeType.startsWith('image/')) {
                    await processFile(chatId, document.file_id, document.file_size, mimeType, userLink, from.id);
                } else {
                    await sendMessage(chatId, "❌ Please send only image files.");
                }
            }
            return new NextResponse('OK');
        }

        return new NextResponse('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        return new NextResponse('OK'); // Always return OK to Telegram
    }
}

async function processFile(chatId: number, fileId: string, fileSize: number, mimeType: string, userLink: string, userId: number | string) {
    try {
        const id = generateId();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';

        // 1. Forward to DB Channel with caption
        await sendPhotoToChannel(fileId, `👤 <b>Uploaded by:</b> ${userLink}`);

        // 2. Save to DB
        await saveImage({
            id,
            telegram_file_id: fileId,
            created_at: Date.now(),
            metadata: {
                size: fileSize,
                type: mimeType
            }
        }, 'bot', userId);

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
