/**
 * PixEdge v2 — Telegram MTProto layer (gramjs)
 * ─────────────────────────────────────────────
 * Replaces the Bot API for file transfers, lifting the 50 MB cap to 2 GB.
 * Bot API is still used for bot messages (sendMessage, sendLog, etc.)
 *
 * Graceful degradation:
 *   If TELEGRAM_SESSION_STRING is not set the upload route falls back to
 *   the Bot API automatically, so the app keeps working without MTProto.
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram';
import { CustomFile } from 'telegram/client/uploads';

// ─── Singleton state ──────────────────────────────────────────────────────────

let _client: TelegramClient | null = null;
type InputEntity = Awaited<ReturnType<TelegramClient['getInputEntity']>>;
let _channelEntity: InputEntity | null = null;
let _connecting = false;
function sanitizeEnv(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        const unwrapped = trimmed.slice(1, -1).trim();
        return unwrapped || undefined;
    }

    return trimmed;
}

function getGramConfig() {
    return {
        apiIdRaw: sanitizeEnv(process.env.TELEGRAM_API_ID),
        apiHash: sanitizeEnv(process.env.TELEGRAM_API_HASH),
        sessionString: sanitizeEnv(process.env.TELEGRAM_SESSION_STRING),
        chatId: sanitizeEnv(process.env.TELEGRAM_CHAT_ID),
    };
}

// ─── Configuration check ──────────────────────────────────────────────────────

/** Returns true when all three MTProto env vars are present. */
export function isGramConfigured(): boolean {
    const { apiIdRaw, apiHash, sessionString } = getGramConfig();
    const apiId = apiIdRaw ? parseInt(apiIdRaw, 10) : NaN;
    return Number.isFinite(apiId) && apiId > 0 && !!apiHash && !!sessionString;
}

// ─── Client management ────────────────────────────────────────────────────────

/**
 * Returns a connected TelegramClient singleton.
 * Safe to call on every request — reconnects automatically if needed.
 */
export async function getGramClient(): Promise<TelegramClient> {
    if (!isGramConfigured()) {
        throw new Error(
            '[gramjs] MTProto not configured. ' +
            'Set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION_STRING.'
        );
    }

    const { apiIdRaw, apiHash, sessionString } = getGramConfig();
    const apiId = apiIdRaw ? parseInt(apiIdRaw, 10) : NaN;

    if (!Number.isFinite(apiId) || apiId <= 0) {
        throw new Error('[gramjs] TELEGRAM_API_ID must be a positive integer.');
    }

    if (!apiHash || !sessionString) {
        throw new Error('[gramjs] TELEGRAM_API_HASH and TELEGRAM_SESSION_STRING are required.');
    }

    // Already connected — return immediately
    if (_client?.connected) return _client;

    // Another coroutine is connecting — wait for it
    if (_connecting) {
        let waited = 0;
        while (_connecting && waited < 12_000) {
            await new Promise(r => setTimeout(r, 250));
            waited += 250;
        }
        if (_client?.connected) return _client;
    }

    _connecting = true;
    try {
        let stringSession: StringSession;
        try {
            stringSession = new StringSession(sessionString);
        } catch (error: any) {
            throw new Error(
                `[gramjs] Invalid TELEGRAM_SESSION_STRING. Regenerate it with "npm run generate:session". (${error?.message || error})`
            );
        }
        _client = new TelegramClient(
            stringSession,
            apiId,
            apiHash,
            {
                connectionRetries: 5,
                retryDelay: 1_000,
                autoReconnect: true,
            }
        );
        await _client.connect();
        console.log('[gramjs] MTProto connected ✓');
        return _client;
    } finally {
        _connecting = false;
    }
}

/** Resolves (and caches) the storage channel entity once. */
async function getChannel(client: TelegramClient): Promise<InputEntity> {
    if (_channelEntity) return _channelEntity;
    const { chatId } = getGramConfig();
    if (!chatId) {
        throw new Error('[gramjs] TELEGRAM_CHAT_ID is required when MTProto is enabled.');
    }
    _channelEntity = await client.getInputEntity(chatId);
    return _channelEntity;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface GramUploadResult {
    /** MTProto channel message ID — stored in Redis for later retrieval. */
    message_id: number;
    /** Document ID string — stored as telegram_file_id for display/compat. */
    telegram_file_id: string;
}

/**
 * Uploads a file to the storage channel via MTProto.
 * Handles files up to 2 GB. Uses parallel workers for large files.
 *
 * @param fileBuffer  Complete file data as a Node.js Buffer.
 * @param fileName    Original filename (used by Telegram for document attributes).
 * @param fileSize    Byte length of the file.
 * @param caption     Optional HTML caption stored in the channel message.
 */
export async function uploadFileViaGram(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number,
    caption = ''
): Promise<GramUploadResult> {
    const client = await getGramClient();
    const channel = await getChannel(client);

    // Scale parallel workers with file size (more workers = faster large uploads)
    const workers =
        fileSize > 500 * 1024 * 1024 ? 16  // > 500 MB
            : fileSize > 100 * 1024 * 1024 ? 8   // > 100 MB
            : fileSize > 10  * 1024 * 1024 ? 4   // > 10 MB
            : 1;                                   // small

    const file = new CustomFile(fileName, fileSize, '', fileBuffer);

    const message = await client.sendFile(channel, {
        file,
        caption,
        parseMode: 'html',
        // forceDocument keeps the original file intact (no re-encoding)
        // and works consistently for every MIME type including video/gif.
        forceDocument: true,
        workers,
    }) as Api.Message;

    // Extract the document ID for display purposes
    let telegramFileId = `gram_msg_${message.id}`;
    if (
        message.media instanceof Api.MessageMediaDocument &&
        message.media.document instanceof Api.Document
    ) {
        telegramFileId = message.media.document.id.toString();
    }

    console.log(`[gramjs] Uploaded ${(fileSize / 1024 / 1024).toFixed(1)} MB → msg ${message.id}`);

    return {
        message_id: message.id,
        telegram_file_id: telegramFileId,
    };
}

// ─── Stream / Serve ───────────────────────────────────────────────────────────

export interface GramFileInfo {
    /** MIME type of the stored file. */
    contentType: string;
    /** File size in bytes (0 if unknown). */
    fileSize: number;
    /** Original filename, if available. */
    fileName?: string;
    /** Is this a partial byte range response (206)? */
    isPartial?: boolean;
    /** Start byte (inclusive) if range was requested. */
    start?: number;
    /** End byte (inclusive) if range was requested. */
    end?: number;
    /** Length of the byte stream served. */
    contentLength?: number;
    /**
     * True-streaming ReadableStream.
     * For documents this uses iterDownload so only 1 MB is in RAM at a time.
     * For photos (sent without forceDocument) the whole jpeg is buffered once.
     */
    stream: ReadableStream<Uint8Array>;
}

/**
 * Fetches a file stored by uploadFileViaGram and returns a streaming response.
 * Documents are streamed in 1 MB chunks — RAM usage stays flat regardless of
 * file size, making it safe to serve multi-GB files.
 * Supports HTTP Range requests for video seeking/scrubbing.
 *
 * @param messageId  The message_id value stored in Redis.
 * @param range      Optional start and end byte offsets.
 */
export async function streamFileViaGram(
    messageId: number,
    range?: { start: number; end: number }
): Promise<GramFileInfo> {
    const client = await getGramClient();
    const channel = await getChannel(client);

    const messages = await client.getMessages(channel, { ids: [messageId] });
    const message = messages[0];

    if (!message?.media) {
        throw new Error(`[gramjs] Message ${messageId} not found or has no media`);
    }

    // ── Document path (used for all v2 uploads because forceDocument=true) ──
    if (
        message.media instanceof Api.MessageMediaDocument &&
        message.media.document instanceof Api.Document
    ) {
        const doc = message.media.document;
        const contentType = doc.mimeType || 'application/octet-stream';
        const fileSize = Number(doc.size);

        // Extract original filename from document attributes
        let fileName: string | undefined;
        for (const attr of doc.attributes) {
            if (attr instanceof Api.DocumentAttributeFilename) {
                fileName = attr.fileName;
                break;
            }
        }

        // Handle Byte Range parameters
        let start = 0;
        let end = fileSize - 1;
        let isPartial = false;

        if (range && fileSize > 0) {
            start = Math.max(0, Math.min(range.start, fileSize - 1));
            end = Math.max(start, Math.min(range.end, fileSize - 1));
            isPartial = true;
        }

        const contentLength = end - start + 1;

        // Build the InputFileLocation required by iterDownload
        const fileLocation = new Api.InputDocumentFileLocation({
            id: doc.id,
            accessHash: doc.accessHash,
            fileReference: doc.fileReference,
            thumbSize: '',
        });

        // 4 KB alignment calculation for Telegram MTProto
        const alignedStart = Math.floor(start / 4096) * 4096;
        let skipFirst = start - alignedStart;
        let remainingToSend = contentLength;

        // True streaming — 1 MB per Telegram API round-trip, flat RAM usage
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    for await (const chunkRaw of (client as any).iterDownload({
                        file: fileLocation,
                        offset: BigInt(alignedStart),
                        requestSize: 1024 * 1024, // 1 MB chunks
                        dcId: doc.dcId,
                    })) {
                        let chunk = Buffer.from(chunkRaw as Buffer);

                        if (skipFirst > 0) {
                            if (chunk.length <= skipFirst) {
                                skipFirst -= chunk.length;
                                continue;
                            }
                            chunk = chunk.subarray(skipFirst);
                            skipFirst = 0;
                        }

                        if (chunk.length >= remainingToSend) {
                            controller.enqueue(new Uint8Array(chunk.subarray(0, remainingToSend)));
                            remainingToSend = 0;
                            controller.close();
                            break;
                        } else {
                            controller.enqueue(new Uint8Array(chunk));
                            remainingToSend -= chunk.length;
                        }
                    }

                    if (remainingToSend > 0) {
                        controller.close();
                    }
                } catch (err) {
                    controller.error(err);
                }
            },
        });

        return {
            contentType,
            fileSize,
            fileName,
            isPartial,
            start,
            end,
            contentLength,
            stream
        };
    }

    // ── Photo path (legacy v1 uploads sent without forceDocument) ──
    if (message.media instanceof Api.MessageMediaPhoto) {
        const buffer = (await client.downloadMedia(message, {})) as Buffer;
        const fileSize = buffer.length;

        let start = 0;
        let end = fileSize - 1;
        let isPartial = false;

        if (range && fileSize > 0) {
            start = Math.max(0, Math.min(range.start, fileSize - 1));
            end = Math.max(start, Math.min(range.end, fileSize - 1));
            isPartial = true;
        }

        const contentLength = end - start + 1;
        const slicedBuffer = buffer.subarray(start, end + 1);

        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                const CHUNK = 64 * 1024;
                for (let offset = 0; offset < slicedBuffer.length; offset += CHUNK) {
                    controller.enqueue(new Uint8Array(slicedBuffer.buffer, slicedBuffer.byteOffset + offset, Math.min(CHUNK, slicedBuffer.length - offset)));
                }
                controller.close();
            },
        });

        return {
            contentType: 'image/jpeg',
            fileSize,
            fileName: undefined,
            isPartial,
            start,
            end,
            contentLength,
            stream,
        };
    }

    throw new Error(`[gramjs] Unsupported media type in message ${messageId}`);
}
