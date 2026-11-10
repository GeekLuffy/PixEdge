import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { TelegramUpdate, sendMessage, sendMediaToChannel, sendLog, escapeHtml, deleteTelegramMessage, answerCallbackQuery } from '@/lib/telegram';
import { saveImage, generateId, getStats, registerUser, createLinkToken, isAccountLinked, getLinkedWebAccount, unlinkTelegramAccount, getImage } from '@/lib/db';
import { validateCustomId, generateSuggestions } from '@/lib/slugs';

export async function POST(req: NextRequest) {
    try {
        // Verify Telegram Webhook Secret Token if configured
        const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
        if (webhookSecret) {
            const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
            if (incomingSecret !== webhookSecret) {
                console.warn('[webhook] Unauthorized: secret token mismatch');
                return new NextResponse('Unauthorized', { status: 401 });
            }
        }

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
                await answerCallbackQuery(callbackId, success ? 'Account disconnected' : 'Failed to disconnect');
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

        const rawName = from.first_name || '';
        const userLink = from.username
            ? `@${escapeHtml(from.username)}`
            : `${escapeHtml(rawName)} [${from.id}]`;

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
                    `/link or /login - Connect to your web account\n` +
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

            if (command === '/login' || command === '/link') {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';

                const { getTelegramUserProfilePhoto } = await import('@/lib/telegram');
                const photoUrl = await getTelegramUserProfilePhoto(from.id, baseUrl);

                let redis: any = null;
                try {
                    const { Redis } = await import('@upstash/redis');
                    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
                        redis = new Redis({
                            url: process.env.UPSTASH_REDIS_REST_URL.trim(),
                            token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
                        });
                    }
                } catch (e) {
                    console.error('Failed to init Redis for login PIN:', e);
                }

                // Clean up any existing pending login prompt for this user to prevent confusion
                if (redis) {
                    try {
                        const prevLoginStr: any = await redis.get(`telegram:active_login:${from.id}`);
                        if (prevLoginStr) {
                            const prevLogin = typeof prevLoginStr === 'string' ? JSON.parse(prevLoginStr) : prevLoginStr;
                            if (prevLogin?.chat_id && prevLogin?.message_id) {
                                await deleteTelegramMessage(prevLogin.chat_id, prevLogin.message_id);
                            }
                            if (prevLogin?.pin) {
                                await redis.del(`telegram:login_pin:${prevLogin.pin}`);
                            }
                        }
                    } catch (cleanupErr) {
                        console.warn('[webhook] Could not clean up previous login message:', cleanupErr);
                    }
                }

                // Generate cryptographically secure 6-digit PIN (valid for 2 minutes)
                let pin = '';
                if (redis) {
                    let stored = false;
                    for (let attempt = 0; attempt < 5 && !stored; attempt++) {
                        pin = randomInt(100000, 1000000).toString();
                        const result = await redis.set(
                            `telegram:login_pin:${pin}`,
                            'pending',
                            { ex: 120, nx: true }
                        );
                        stored = result === 'OK';
                    }
                }
                if (!pin) {
                    pin = Math.floor(100000 + Math.random() * 900000).toString();
                }

                // Generate 1-Click Login URL with PIN
                const directLoginUrl = `${baseUrl}/login?pin=${pin}`;

                const sentMessage = await sendMessage(chatId,
                    `🔑 <b>PixEdge Web Login</b>\n\n` +
                    `1️⃣ <b>Option A (1-Click Login):</b>\n` +
                    `Tap the button below to log in directly:\n\n` +
                    `2️⃣ <b>Option B (PIN Code):</b>\n` +
                    `Your PIN: <code>${pin}</code>\n` +
                    `<i>Enter this PIN on the login page.</i>\n\n` +
                    `<i>Expires in 2 minutes.</i>`,
                    'HTML',
                    {
                        inline_keyboard: [[
                            { text: "🔗 1-Click Login to Website", url: directLoginUrl }
                        ]]
                    }
                );

                const sentMessageId = sentMessage?.message_id;

                if (redis) {
                    await redis.set(
                        `telegram:login_pin:${pin}`,
                        JSON.stringify({
                            id: from.id,
                            chat_id: chatId,
                            message_id: sentMessageId,
                            first_name: from.first_name,
                            username: from.username,
                            photo_url: photoUrl || null
                        }),
                        { ex: 120 }
                    );

                    if (sentMessageId) {
                        await redis.set(
                            `telegram:active_login:${from.id}`,
                            JSON.stringify({ pin, chat_id: chatId, message_id: sentMessageId }),
                            { ex: 120 }
                        );

                        // If under 2 min no login then delete prompt and send login fail message
                        setTimeout(async () => {
                            try {
                                const currentPinData = await redis.get(`telegram:login_pin:${pin}`);
                                if (currentPinData) {
                                    // Still exists, so login never occurred within 2 minutes
                                    await redis.del(`telegram:login_pin:${pin}`);
                                    await redis.del(`telegram:active_login:${from.id}`);
                                    await deleteTelegramMessage(chatId, sentMessageId);
                                    await sendMessage(
                                        chatId,
                                        `⌛ <b>Login Expired / Failed</b>\n\n` +
                                        `No login was detected within 2 minutes. The link and PIN have expired.\n\n` +
                                        `Send /login to request a new login link.`,
                                        'HTML'
                                    );
                                }
                            } catch (expiryErr) {
                                console.error('[webhook] 2-minute login expiration error:', expiryErr);
                            }
                        }, 120 * 1000);
                    }
                }

                return new NextResponse('OK');
            }

            if (command === '/status') {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';
                const linked = await isAccountLinked(from.id);
                            
                if (linked) {
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
        await sendLog(`⚠️ <b>Webhook Error</b>\n\nError: ${error}`).catch(() => {});
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
