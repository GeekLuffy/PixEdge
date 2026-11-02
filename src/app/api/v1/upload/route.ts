import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import busboy from 'busboy';
import { uploadToTelegram, sendLog } from '@/lib/telegram';
import { saveImage, generateId, rateLimit, getImage, verifyApiKey } from '@/lib/db';
import { isGramConfigured, uploadFileViaGram } from '@/lib/gramjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateCustomId, generateSuggestions } from '@/lib/slugs';

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

// Logging must never fail the upload response path
async function safeSendLog(text: string): Promise<void> {
    try {
        await sendLog(text);
    } catch (error) {
        console.error('sendLog failed:', error);
    }
}

interface ParsedMultipart {
    fields: Record<string, string>;
    tempFilePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

/**
 * Streams incoming multipart upload directly to disk using busboy.
 * Memory footprint stays < 15 MB even for 2 GB video uploads!
 */
function parseMultipartUpload(req: NextRequest): Promise<ParsedMultipart> {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
        return Promise.reject(new Error('INVALID_CONTENT_TYPE'));
    }

    if (!req.body) {
        return Promise.reject(new Error('EMPTY_BODY'));
    }

    return new Promise((resolve, reject) => {
        let bb: busboy.Busboy;
        try {
            bb = busboy({
                headers: { 'content-type': contentType },
                limits: {
                    fileSize: 2 * 1024 * 1024 * 1024, // 2 GB limit
                }
            });
        } catch (err) {
            return reject(err);
        }

        const fields: Record<string, string> = {};
        let tempFilePath = '';
        let fileName = '';
        let mimeType = 'application/octet-stream';
        let fileSize = 0;
        let fileFound = false;
        let writeError: Error | null = null;
        let writeStream: fs.WriteStream | null = null;
        let isDone = false;

        const cleanupAndReject = (err: Error) => {
            if (isDone) return;
            isDone = true;
            if (writeStream) {
                try { writeStream.destroy(); } catch {}
            }
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlink(tempFilePath, () => {});
            }
            reject(err);
        };

        bb.on('field', (name, val) => {
            fields[name] = val;
        });

        bb.on('file', (name, fileStream, info) => {
            // Ignore empty file fields or extra files if we already started saving one
            if (!info.filename || fileFound) {
                fileStream.resume();
                return;
            }

            fileFound = true;
            fileName = info.filename || 'upload.bin';
            mimeType = info.mimeType || 'application/octet-stream';

            const tempDir = os.tmpdir();
            const uniquePrefix = `pixedge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            tempFilePath = path.join(tempDir, `${uniquePrefix}_${encodeURIComponent(fileName).slice(-60)}`);

            writeStream = fs.createWriteStream(tempFilePath);

            fileStream.on('data', (chunk: Buffer) => {
                fileSize += chunk.length;
            });

            fileStream.on('error', (err) => {
                writeError = err;
            });

            fileStream.pipe(writeStream);

            writeStream.on('error', (err) => {
                writeError = err;
            });
        });

        bb.on('error', cleanupAndReject);

        const handleDone = () => {
            if (isDone) return;

            if (writeError) {
                cleanupAndReject(writeError);
                return;
            }

            if (!fileFound || !tempFilePath) {
                cleanupAndReject(new Error('MISSING_FILE'));
                return;
            }

            if (writeStream) {
                if (writeStream.writableFinished) {
                    isDone = true;
                    resolve({
                        fields,
                        tempFilePath,
                        fileName,
                        fileSize,
                        mimeType,
                    });
                } else {
                    writeStream.on('finish', () => {
                        if (isDone) return;
                        isDone = true;
                        resolve({
                            fields,
                            tempFilePath,
                            fileName,
                            fileSize,
                            mimeType,
                        });
                    });
                }
            } else {
                cleanupAndReject(new Error('MISSING_FILE'));
            }
        };

        bb.on('finish', handleDone);
        bb.on('close', handleDone);

        const nodeReadable = Readable.fromWeb(req.body as any);
        nodeReadable.on('error', cleanupAndReject);
        nodeReadable.pipe(bb);
    });
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

    let parsed: ParsedMultipart;
    try {
        parsed = await parseMultipartUpload(req);
    } catch (parseError: any) {
        if (parseError.message === 'MISSING_FILE' || parseError.message === 'EMPTY_BODY') {
            return NextResponse.json({
                success: false,
                error: { code: 'MISSING_FILE', message: 'No file provided in request' }
            }, { status: 400 });
        }
        if (parseError.message === 'INVALID_CONTENT_TYPE') {
            return NextResponse.json({
                success: false,
                error: { code: 'INVALID_REQUEST', message: 'Content-Type must be multipart/form-data' }
            }, { status: 400 });
        }
        console.error('Multipart parse error:', parseError);
        return NextResponse.json({
            success: false,
            error: { code: 'UPLOAD_FAILED', message: 'Failed to process file upload stream' }
        }, { status: 500 });
    }

    const { fields, tempFilePath, fileName, fileSize, mimeType } = parsed;

    try {
        const customId = typeof fields.customId === 'string' ? fields.customId.trim() : '';

        // Optional target folder for organizing the upload
        const folder = typeof fields.folder === 'string' && fields.folder.trim() ? fields.folder.trim() : undefined;

        // Optional expiry in seconds (3600=1h, 86400=24h, 604800=7d, 2592000=30d)
        const expiresInRaw = typeof fields.expiresIn === 'string' ? fields.expiresIn : null;
        const VALID_EXPIRY = [3600, 86400, 604800, 2592000];
        const expiresInParsed = expiresInRaw ? parseInt(expiresInRaw, 10) : NaN;
        const expiresIn = Number.isFinite(expiresInParsed) && VALID_EXPIRY.includes(expiresInParsed)
            ? expiresInParsed
            : undefined;

        // Optional Secret PIN or Password for link protection
        const passwordRaw = typeof fields.password === 'string' ? fields.password.trim() : '';
        let password_hash: string | undefined = undefined;
        if (passwordRaw) {
            const crypto = await import('crypto');
            password_hash = crypto.createHash('sha256').update(passwordRaw).digest('hex');
        }

        // Optional Burn After Reading self-destruct settings
        const burnAfterView = fields.burnAfterView === 'true' || fields.burnAfterView === '1';
        const burnAfterDownload = fields.burnAfterDownload === 'true' || fields.burnAfterDownload === '1';

        // Enforce size limit:
        //   gramjs (MTProto) configured → up to MAX_UPLOAD_SIZE_MB (default 2000 MB = 2 GB)
        //   Bot API fallback            → up to 50 MB (Telegram Bot API hard limit)
        let gramReady = isGramConfigured();
        const configuredMaxMB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '2000', 10);
        const maxMB = gramReady
            ? (Number.isFinite(configuredMaxMB) && configuredMaxMB > 0 ? configuredMaxMB : 2000)
            : 50;
        const MAX_SIZE = maxMB * 1024 * 1024;

        if (fileSize > MAX_SIZE) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: `File too large. Max size is ${maxMB} MB.`,
                }
            }, { status: 400 });
        }

        // 1. Generate or validate ID (fail fast on ID errors before upload)
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
            try {
                // Stream chunks directly from disk to Telegram via CustomFile
                const gramResult = await uploadFileViaGram(
                    tempFilePath,
                    fileName,
                    fileSize,
                    `📦 <b>PixEdge Upload</b>\nSize: ${(fileSize / 1024 / 1024).toFixed(2)} MB`
                );

                record = {
                    id,
                    telegram_file_id: gramResult.telegram_file_id,
                    message_id: gramResult.message_id,
                    created_at: Date.now(),
                    folder,
                    password_hash,
                    burn_after_view: burnAfterView,
                    burn_after_download: burnAfterDownload,
                    metadata: { size: fileSize, type: mimeType, version: 'v2' },
                };
                usedGram = true;
            } catch (gramError: any) {
                console.error('MTProto upload failed, checking fallback:', gramError);

                const BOT_API_MAX_SIZE = 50 * 1024 * 1024;
                if (fileSize > BOT_API_MAX_SIZE) {
                    return NextResponse.json({
                        success: false,
                        error: {
                            code: 'MTPROTO_UNAVAILABLE',
                            message: 'Uploads larger than 50 MB require MTProto. Check TELEGRAM_SESSION_STRING configuration.',
                        }
                    }, { status: 503 });
                }
            }
        }

        if (!record) {
            // ── v1: Bot API fallback — max 50 MB ──
            let mediaType: 'photo' | 'animation' | 'video' = 'photo';
            if (mimeType.startsWith('video/')) mediaType = 'video';
            if (mimeType === 'image/gif') mediaType = 'animation';

            const fileBuffer = await fs.promises.readFile(tempFilePath);
            const fileBlob = new Blob([fileBuffer], { type: mimeType });

            const telegramResult = await uploadToTelegram(
                fileBlob, fileName, '📦 <b>Uploaded in web</b>', mediaType
            );

            record = {
                id,
                telegram_file_id: telegramResult.file_id,
                created_at: Date.now(),
                folder,
                password_hash,
                burn_after_view: burnAfterView,
                burn_after_download: burnAfterDownload,
                metadata: { size: fileSize, type: mimeType, version: 'v1' },
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
            `Type: ${mimeType}\n` +
            `Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n` +
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
            error: { code: 'INTERNAL_ERROR', message: 'Failed to process media upload' }
        }, { status: 500 });
    } finally {
        if (tempFilePath) {
            try {
                await fs.promises.unlink(tempFilePath);
            } catch {
                // Ignore cleanup error if already removed
            }
        }
    }
}