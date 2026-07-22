import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, sendMessage, sendMediaToChannel, sendLog } from '@/lib/telegram';
import { saveImage, generateId, getStats, registerUser, createLinkToken, isAccountLinked, getLinkedWebAccount, unlinkTelegramAccount, getImage } from '@/lib/db';
import { validateCustomId, generateSuggestions } from '@/lib/slugs';

export async function POST(req: NextRequest) {
    try {
        const body: TelegramUpdate = await req.json();

        // Handle callback queries FIRST
        if (body.callback_query) {
            const callbackId = body.callback_query.id;
            const chatId = body.callback_query.message?.chat.id;
            const data = body.callback_query.data;
            const fromUser = body.callback_query.from;
            
            if (!chatId || !fromUser) return new NextResponse('OK');
            
            if (data === 'disconnect') {
                const success = await unlinkTelegramAccount(fromUser.id);
                if (success) {
                    await sendMessage(chatId,
                        `🔓 <b>Account Disconnected</b>\n\n` +
                        `Your Telegram has been unlinked from your web account.\n` +
                        `Future uploads will not sync to dashboard.\n\n` +
                        `Use /link anytime to reconnect.`,
                        'HTML'
                    );
                } else {
                    await sendMessage(chatId,
                        `❌ <b>Error</b>\n\nFailed to disconnect. Please try again.`,
                        'HTML'
                    );
                }
                
                // Answer the callback query to remove loading state
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callback_query_id: callbackId,
                        text: success ? 'Account disconnected' : 'Failed to disconnect'
                    })
                });
            }
            
            return new NextResponse('OK');
        }

        if (!body.message) {
            return new NextResponse('OK');
        }

        const chatId = body.message.chat.id;
        const text = body.message.text;
        const photo = body.message?.photo;
        const animation = body.message?.animation;
        const video = body.message?.video;
        const document = body.message?.document;
        const replyTo = body.message?.reply_to_message;
        const from = body.message?.from;

        if (!from) return new NextResponse('OK');

        const userLink = from.username
            ? `@${from.username}`
            : `${from.first_name} [${from.id}]`;

        if (text) {
            const command = text.split(' ')[0].split('@')[0].toLowerCase();

            if (command === '/start') {
                await registerUser(from.id);
                await sendLog(`👤 <b>New User Started Bot</b>\n\nUser: ${userLink}\nID: ${from.id}`);

                await sendMessage(chatId,
                    `✨ <b>Welcome to PixEdge!</b>\n\n` +
                    `Upload photos, videos, or GIFs and get fast edge-hosted links.\n\n` +
                    `📤 <b>To upload:</b>\n` +
                    `• Send media directly\n` +
                    `• Or reply to media with /upload\n\n` +
                    `👉 Use /help to see all commands`,
                    'HTML',
                    {
                        inline_keyboard: [[
                            { text: "🌐 Visit Website", url: "https://pixedge.vercel.app" }
                        ]]
                    }
                );
                return new NextResponse('OK');
            }

            if (command === '/help') {
                await sendMessage(chatId,
                    `✨ <b>PixEdge Bot Help</b>\n\n` +
                    `I can host your media at lightning speed using our edge infrastructure.\n\n` +
                    `🚀 <b>How to Upload:</b>\n` +
                    `• Send a <b>Photo/Video/GIF</b> directly to me.\n` +
                    `• Send an <b>Image/Video/GIF</b> as a <b>Document</b>.\n` +
                    `• Or <b>Reply</b> to an existing Media with /upload or /tgm.\n\n` +
                    `<b>Commands:</b>\n` +
                    `/login - Connect to your web account\n` +
                    `/status - Check account link status\n` +
                    `/disconnect - Disconnect from web account\n` +
                    `/stats - Show bot statistics\n` +
                    `/upload or /tgm - Upload a replied Media\n` +
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
                    `🖼️ <b>Images:</b> ${stats.totalImages}\n` +
                    `🎬 <b>Videos/GIFs:</b> ${stats.totalVideos}\n` +
                    `🤖 <b>Bot Uploads:</b> ${stats.botUploads}\n` +
                    `🌐 <b>Web Uploads:</b> ${stats.webUploads}\n` +
                    `📶 <b>Ping:</b> ${stats.ping}ms`,
                    'HTML'
                );
                return new NextResponse('OK');
            }

            if (command === '/login') {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';

                // Check if already logged in
                const alreadyLinked = await isAccountLinked(from.id);
                if (alreadyLinked) {
                    await sendMessage(chatId,
                        `✅ <b>Already Logged In!</b>\n\n` +
                        `Your Telegram account is already connected to your PixEdge web account.\n\n` +
                        `All your bot uploads will appear in your dashboard.`,
                        'HTML',
                        {
                            inline_keyboard: [[
                                { text: "📊 Open Dashboard", url: `${baseUrl}/dashboard` }
                            ]]
                        }
                    );
                    return new NextResponse('OK');
                }

                // Generate link token
                const token = await createLinkToken(from.id);
                const linkUrl = `${baseUrl}/login?link=${token}`;

                await sendMessage(chatId,
                    `🔗 <b>Link Your Account</b>\n\n` +
                    `Click the button below to connect your Telegram to your PixEdge web account.\n\n` +
                    `<i>This link expires in 5 minutes.</i>`,
                    'HTML',
                    {
                        inline_keyboard: [[
                            { text: "🔗 Link Account", url: linkUrl }
                        ]]
                    }
                );
                return new NextResponse('OK');
            }

            if (command === '/status') {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';
                const linked = await isAccountLinked(from.id);
                const linkedAccount = linked ? await getLinkedWebAccount(from.id) : null;
                            
                if (linked && linkedAccount) {
                    await sendMessage(chatId,
                        `✅ <b>Account Status: Linked</b>\n\n` +
                        `Your Telegram is connected to your PixEdge account.\n` +
                        `All uploads from this bot will appear in your dashboard.`,
                        'HTML',
                        {
                            inline_keyboard: [
                                [{ text: "📊 Open Dashboard", url: `${baseUrl}/dashboard` }],
                                [{ text: "🔓 Disconnect Account", callback_data: "disconnect" }]
                            ]
                        }
                    );
                } else {
                    await sendMessage(chatId,
                        `❌ <b>Account Status: Not Linked</b>\n\n` +
                        `Your Telegram is not connected to a web account.\n` +
                        `Use /login to connect and sync your uploads.`,
                        'HTML'
                    );
                }
                return new NextResponse('OK');
            }
            
            if (command === '/disconnect') {
                const linked = await isAccountLinked(from.id);
                if (!linked) {
                    await sendMessage(chatId,
                        `❌ <b>Not Connected</b>\n\n` +
                        `Your account is not linked to any web account.\n` +
                        `Use /login to connect first.`,
                        'HTML'
                    );
                    return new NextResponse('OK');
                }
            
                const success = await unlinkTelegramAccount(from.id);
                if (success) {
                    await sendMessage(chatId,
                        `🔓 <b>Account Disconnected</b>\n\n` +
                        `Your Telegram has been unlinked from your web account.\n` +
                        `Future uploads will not sync to dashboard.\n\n` +
                        `Use /login anytime to reconnect.`,
                        'HTML'
                    );
                } else {
                    await sendMessage(chatId,
                        `❌ <b>Error</b>\n\nFailed to disconnect. Please try again.`,
                        'HTML'
                    );
                }
                return new NextResponse('OK');
            }

            if (command === '/upload' || command === '/tgm' || command === '/slug') {
                const parts = text.split(' ').slice(1).join(' ').trim();
                const customSlug = parts.length > 0 ? parts : undefined;

                // Check if it's a reply to an image/video/document
                if (replyTo) {
                    if (replyTo.photo && replyTo.photo.length > 0) {
                        const largestPhoto = replyTo.photo[replyTo.photo.length - 1];
                        await processFile(chatId, largestPhoto.file_id, largestPhoto.file_size, 'image/jpeg', userLink, from.id, 'photo', customSlug);
                        return new NextResponse('OK');
                    }
                    if (replyTo.animation) {
                        await processFile(chatId, replyTo.animation.file_id, replyTo.animation.file_size, replyTo.animation.mime_type || 'image/gif', userLink, from.id, 'animation', customSlug);
                        return new NextResponse('OK');
                    }
                    if (replyTo.video) {
                        await processFile(chatId, replyTo.video.file_id, replyTo.video.file_size, replyTo.video.mime_type || 'video/mp4', userLink, from.id, 'video', customSlug);
                        return new NextResponse('OK');
                    }
                    if (replyTo.document && (replyTo.document.mime_type?.startsWith('image/') || replyTo.document.mime_type?.startsWith('video/'))) {
                        await processFile(chatId, replyTo.document.file_id, replyTo.document.file_size, replyTo.document.mime_type, userLink, from.id, 'document', customSlug);
                        return new NextResponse('OK');
                    }
                }

                // If not a reply, show instructions with custom slug help
                await sendMessage(chatId,
                    `<b>PixEdge Upload & Custom Vanity Slug Mode:</b>\n\n` +
                    `1. Directly send a photo/video to this bot with an optional custom slug caption (e.g. <code>my-cool-link</code>).\n` +
                    `2. Or <b>reply</b> to an image with <code>/upload my-custom-link</code> or <code>/slug my-custom-link</code>.\n\n` +
                    `I will instantly generate a high-speed vanity link!`
                );
                return new NextResponse('OK');
            }

            // Fallback for unknown text
            if (body.message.chat.type === 'private') {
                await sendMessage(chatId,
                    `❓ <b>I'm not sure what you mean.</b>\n\n` +
                    `Just send me any <b>Photo</b> or <b>Video/GIF</b> (or reply with <code>/upload custom-slug</code>) and I will host it for you! Type /help for options.`,
                    'HTML'
                );
            }
            return new NextResponse('OK');
        }

        // Extract caption if present for custom vanity slug
        const rawCaption = body.message.caption?.trim();
        let captionSlug: string | undefined = undefined;
        if (rawCaption) {
            if (rawCaption.startsWith('/upload') || rawCaption.startsWith('/tgm') || rawCaption.startsWith('/slug')) {
                const afterCmd = rawCaption.split(' ').slice(1).join(' ').trim();
                if (afterCmd) captionSlug = afterCmd;
            } else {
                captionSlug = rawCaption.split('\n')[0].trim();
            }
        }

        // Handle Photo
        if (photo && photo.length > 0) {
            if (body.message.chat.type === 'private') {
                const largestPhoto = photo[photo.length - 1];
                await processFile(chatId, largestPhoto.file_id, largestPhoto.file_size, 'image/jpeg', userLink, from.id, 'photo', captionSlug);
            }
            return new NextResponse('OK');
        }

        // Handle Animation (GIF)
        if (animation) {
            if (body.message.chat.type === 'private') {
                await processFile(chatId, animation.file_id, animation.file_size, animation.mime_type || 'image/gif', userLink, from.id, 'animation', captionSlug);
            }
            return new NextResponse('OK');
        }

        // Handle Video
        if (video) {
            if (body.message.chat.type === 'private') {
                await processFile(chatId, video.file_id, video.file_size, video.mime_type || 'video/mp4', userLink, from.id, 'video', captionSlug);
            }
            return new NextResponse('OK');
        }

        // Handle Document (image or video/gif)
        if (document) {
            // Only process direct documents in PRIVATE chats
            if (body.message.chat.type === 'private') {
                const mimeType = document.mime_type || '';
                if (mimeType.startsWith('image/')) {
                    await processFile(chatId, document.file_id, document.file_size, mimeType, userLink, from.id, 'document', captionSlug);
                } else if (mimeType.startsWith('video/')) {
                    await processFile(chatId, document.file_id, document.file_size, mimeType, userLink, from.id, 'document', captionSlug);
                } else {
                    await sendMessage(chatId, "❌ Please send only image, video or GIF files.");
                }
            }
            return new NextResponse('OK');
        }

        return new NextResponse('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        await sendLog(`⚠️ <b>Webhook Error</b>\n\nError: ${error}`);
        return new NextResponse('OK'); // Always return OK to Telegram
    }
}

async function processFile(
    chatId: number,
    fileId: string,
    fileSize: number,
    mimeType: string,
    userLink: string,
    telegramUserId: number | string,
    mediaType: 'photo' | 'animation' | 'video' | 'document',
    customSlug?: string
) {
    try {
        const { isGramConfigured } = await import('@/lib/gramjs');
        const gramReady = isGramConfigured();

        // If MTProto is configured, we can stream via gramjs up to 2GB (or MAX_UPLOAD_SIZE_MB)
        // If not configured, we must restrict to 20MB because getFile API will fail to download.
        const configuredMaxMB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '2000', 10);
        const maxMB = gramReady
            ? (Number.isFinite(configuredMaxMB) && configuredMaxMB > 0 ? configuredMaxMB : 2000)
            : 20;
        const MAX_SIZE = maxMB * 1024 * 1024;

        if (fileSize > MAX_SIZE) {
            await sendMessage(chatId, `❌ File too large. Max size is ${maxMB}MB.`);
            return;
        }

        let id = generateId();

        // Custom Vanity Slug Validation & Availability Check
        if (customSlug) {
            const validation = validateCustomId(customSlug);
            if (!validation.valid || !validation.sanitized) {
                await sendMessage(chatId,
                    `❌ <b>Invalid Custom Vanity Slug:</b>\n` +
                    `<i>${validation.error || 'Must be 2-32 alphanumeric characters.'}</i>`,
                    'HTML'
                );
                return;
            }

            const requestedSlug = validation.sanitized;
            const existing = await getImage(requestedSlug);
            if (existing) {
                const suggestions = generateSuggestions(requestedSlug);
                const suggestionsText = suggestions.map(s => `• <code>${s}</code>`).join('\n');
                await sendMessage(chatId,
                    `❌ <b>Vanity Slug Already Taken!</b>\n\n` +
                    `The custom link <code>${requestedSlug}</code> is already in use.\n\n` +
                    `💡 <b>Try one of these available options:</b>\n${suggestionsText}`,
                    'HTML'
                );
                return;
            }

            id = requestedSlug;
        }
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';

        // Check if user has linked web account
        const linkedWebAccount = await getLinkedWebAccount(telegramUserId);
        const trackingUserId = linkedWebAccount || telegramUserId.toString();

        let messageId: number | undefined = undefined;

        // 1. Forward to DB Channel with caption
        try {
            const channelResult = await sendMediaToChannel(fileId, `👤 <b>Uploaded by:</b> ${userLink}`, mediaType);
            if (channelResult && 'message_id' in (channelResult as any)) {
                messageId = (channelResult as any).message_id;
            }
        } catch (channelError: any) {
            console.error('Channel forward error:', channelError);
            await sendLog(`⚠️ <b>Channel Forward Failed</b>\n\nUser: ${userLink}\nError: ${channelError.message || channelError}`);
            // We continue anyway so the user gets their link
        }

        // 2. Save to DB (use linked web account if available)
        await saveImage({
            id,
            telegram_file_id: fileId,
            message_id: messageId,
            created_at: Date.now(),
            metadata: {
                size: fileSize,
                type: mimeType,
                version: messageId && gramReady ? 'v2' : 'v1'
            }
        }, 'bot', trackingUserId);

        const publicUrl = `${baseUrl}/i/${id}`;

        // Show linked status in success message
        const linkedNote = linkedWebAccount
            ? `\n📊 <i>Synced to dashboard</i>`
            : `\n💡 <i>Use /login to sync with dashboard</i>`;

        await sendMessage(chatId,
            `✅ <b>File Uploaded Successfully!</b>\n\n` +
            `🔗 <b>Link:</b> ${publicUrl}\n` +
            `⚡ <i>Hosted on PixEdge</i>${linkedNote}`,
            'HTML'
        );

        await sendLog(`📤 <b>New Bot Upload</b>

User: ${userLink}
Type: ${mimeType}
Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
Link: ${publicUrl}`);
    } catch (error) {
        console.error('Processing error:', error);
        await sendLog(`❌ <b>Upload Processing Error</b>\n\nUser: ${userLink}\nError: ${error}`);
        await sendMessage(chatId, "❌ Failed to process your image. Please try again later.");
    }
}
