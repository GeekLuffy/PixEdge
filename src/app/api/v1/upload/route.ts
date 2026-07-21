import { NextRequest, NextResponse } from 'next/server';
import { uploadToTelegram, sendLog } from '@/lib/telegram';
import { saveImage, generateId, rateLimit, getImage, verifyApiKey } from '@/lib/db';
import { isGramConfigured, uploadFileViaGram } from '@/lib/gramjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Allow long-running uploads (Vercel Pro / Northflank)
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

// Resolve authenticated userId from session OR X-API-Key / Authorization header
async function resolveUserId(req: NextRequest): Promise<string | undefined> {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;

    const apiKey =
        req.headers.get('x-api-key') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (apiKey) {
        const userId = await verifyApiKey(apiKey);
        return userId ?? undefined;
    }
    return undefined;
}

// Validate custom ID format
function validateCustomId(id: string): { valid: boolean; error?: string; sanitized?: string } {
    if (!id || id.trim().length === 0) {
        return { valid: false, error: 'Custom ID cannot be empty' };
    }
    
    // Sanitize: lowercase, replace spaces and invalid chars with hyphens
    const sanitized = id.toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    if (sanitized.length < 2) {
        return { valid: false, error: 'Custom ID must be at least 2 characters' };
    }
    
    if (sanitized.length > 32) {
        return { valid: false, error: 'Custom ID must be 32 characters or less' };
    }
    
    // Reserved IDs
    const reserved = ['api', 'admin', 'dashboard', 'login', 'docs', 'upload', 'i', 'static'];
    if (reserved.includes(sanitized)) {
        return { valid: false, error: 'This ID is reserved' };
    }
    
    return { valid: true, sanitized };
}

// Generate alternative suggestions
function generateSuggestions(baseId: string): string[] {
    const suggestions: string[] = [];
    const timestamp = Date.now().toString(36).slice(-4);
    const random = () => Math.random().toString(36).slice(-3);
    
    suggestions.push(`${baseId}-${timestamp}`);
    suggestions.push(`${baseId}-${random()}`);
    suggestions.push(`${baseId}${Math.floor(Math.random() * 999)}`);
    
    return suggestions;
}

// Logging must never fail the upload response path
async function safeSendLog(text: string): Promise<void> {
    try {
        await sendLog(text);
    } catch (error) {
        console.error('sendLog failed:', error);
    }
}

export async function POST(req: NextRequest) {
    // Resolve authenticated userId (session or API key)
    const userId = await resolveUserId(req);
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';

    // Authenticated users get 100 uploads/min; anonymous users get 20/min
    const rateLimitKey = userId ? `upload:user:${userId}` : `upload:ip:${ip}`;
    const rateLimitMax = userId ? 100 : 20;
    const limit = await rateLimit(rateLimitKey, rateLimitMax, 60);

    if (!limit.success) {
        return NextResponse.json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many uploads. Try again in ${limit.remaining === 0 ? 'a minute' : 'a moment'}.`
            }
        }, {
            status: 429,
            headers: {
                'X-RateLimit-Limit': (limit.limit ?? rateLimitMax).toString(),
                'X-RateLimit-Remaining': (limit.remaining ?? 0).toString()
            }
        });
    }

    try {
        const formData = await req.formData();
        const fileEntry = formData.get('file');
        const customIdEntry = formData.get('customId');
        const customId = typeof customIdEntry === 'string' ? customIdEntry : '';

        // Optional target folder for organizing the upload
        const folderEntry = formData.get('folder');
        const folder = typeof folderEntry === 'string' && folderEntry.trim() ? folderEntry.trim() : undefined;

        // Optional expiry in seconds (3600=1h, 86400=24h, 604800=7d, 2592000=30d)
        const expiresInEntry = formData.get('expiresIn');
        const expiresInRaw = typeof expiresInEntry === 'string' ? expiresInEntry : null;
        const VALID_EXPIRY = [3600, 86400, 604800, 2592000];
        const expiresInParsed = expiresInRaw ? parseInt(expiresInRaw, 10) : NaN;
        const expiresIn = Number.isFinite(expiresInParsed) && VALID_EXPIRY.includes(expiresInParsed)
            ? expiresInParsed
            : undefined;

        if (!(fileEntry instanceof Blob)) {
            return NextResponse.json({
                success: false,
                error: { code: 'MISSING_FILE', message: 'No file provided in request' }
            }, { status: 400 });
        }
        const file = fileEntry;

        // Enforce size limit:
        //   gramjs (MTProto) configured → up to MAX_UPLOAD_SIZE_MB (default 2000 MB = 2 GB)
        //   Bot API fallback            → up to 50 MB (Telegram Bot API hard limit)
        let gramReady = isGramConfigured();
        const configuredMaxMB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '2000', 10);
        const maxMB = gramReady
            ? (Number.isFinite(configuredMaxMB) && configuredMaxMB > 0 ? configuredMaxMB : 2000)
            : 50;
        const MAX_SIZE = maxMB * 1024 * 1024;

        if (file.size > MAX_SIZE) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: `File too large. Max size is ${maxMB} MB.`,
                }
            }, { status: 400 });
        }

        // 1. Generate or validate ID (moved before upload so we fail fast on ID errors)
        let id: string;
        
        if (customId) {
            const validation = validateCustomId(customId);
            if (!validation.valid) {
                return NextResponse.json({
                    success: false,
                    error: { code: 'INVALID_CUSTOM_ID', message: validation.error }
                }, { status: 400 });
            }
            
            id = validation.sanitized!;
            
            // Check if ID already exists
            const existing = await getImage(id);
            if (existing) {
                const suggestions = generateSuggestions(id);
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'ID_ALREADY_EXISTS',
                        message: `The ID "${id}" is already taken`,
                        suggestions
                    }
                }, { status: 409 });
            }
        } else {
            id = generateId();
        }

        // 2. Upload — gramjs MTProto (v2) or Bot API fallback (v1)
        let record: any;
        let usedGram = false;

        if (gramReady) {
            // ── v2: MTProto via gramjs — supports up to 2 GB ──
            try {
                const fileObj = file as File;
                const fileMime = file.type || 'application/octet-stream';
                const extension = (fileMime.split('/')[1] || 'bin').toLowerCase();
                const fileName = fileObj.name || `upload.${extension}`;
                const fileBuffer = Buffer.from(await fileObj.arrayBuffer());

                const gramResult = await uploadFileViaGram(
                    fileBuffer,
                    fileName,
                    file.size,
                    `📦 <b>PixEdge Upload</b>\nSize: ${(file.size / 1024 / 1024).toFixed(2)} MB`
                );

                record = {
                    id,
                    telegram_file_id: gramResult.telegram_file_id,
                    message_id: gramResult.message_id,
                    created_at: Date.now(),
                    folder,
                    metadata: { size: file.size, type: file.type, version: 'v2' },
                };
                usedGram = true;
            } catch (gramError: any) {
                console.error('MTProto upload failed, falling back to Bot API:', gramError);

                const BOT_API_MAX_SIZE = 50 * 1024 * 1024;
                if (file.size > BOT_API_MAX_SIZE) {
                    return NextResponse.json({
                        success: false,
                        error: {
                            code: 'MTPROTO_UNAVAILABLE',
                            message: 'Large uploads currently require MTProto. Fix TELEGRAM_SESSION_STRING and retry.',
                        }
                    }, { status: 503 });
                }
            }
        }

        if (!record) {
            // ── v1: Bot API fallback — max 50 MB ──
            let mediaType: 'photo' | 'animation' | 'video' = 'photo';
            if (file.type.startsWith('video/')) mediaType = 'video';
            if (file.type === 'image/gif') mediaType = 'animation';

            const telegramResult = await uploadToTelegram(
                file, 'upload', '📦 <b>Uploaded in web</b>', mediaType
            );

            record = {
                id,
                telegram_file_id: telegramResult.file_id,
                created_at: Date.now(),
                folder,
                metadata: { size: file.size, type: file.type, version: 'v1' },
            };
            usedGram = false;
        }

        // Save to DB (with user tracking if logged in, and optional expiry)
        await saveImage(record, 'web', userId, expiresIn);

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.get('host') ? `http://${req.headers.get('host')}` : '');

        const publicUrl = `${baseUrl}/i/${id}`;

        // Log to Telegram
        await safeSendLog(
            `🌐 <b>New Web Upload</b>\n\n` +
            `Type: ${file.type}\n` +
            `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n` +
            `Mode: ${usedGram ? 'MTProto v2' : 'Bot API v1'}\n` +
            `Link: ${publicUrl}`
        );

        return NextResponse.json({
            success: true,
            data: {
                id,
                url: `${baseUrl}/i/${id}`,
                direct_url: `${baseUrl}/i/${id}.jpg`,
                timestamp: record.created_at,
                expires_at: expiresIn ? Date.now() + expiresIn * 1000 : null,
                upload_mode: usedGram ? 'mtproto_v2' : 'botapi_v1',
            }
        });

    } catch (error: any) {
        console.error('Upload API Error:', error);
        await safeSendLog(`❌ <b>Web Upload Error</b>\n\nError: ${error.message || error}`);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message || 'Server processed request failed' }
        }, { status: 500 });
    }
}