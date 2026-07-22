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

// ─── Connection Pool State ──────────────────────────────────────────────────

interface PoolSlot {
    client: TelegramClient | null;
    channel: InputEntity | null;
    connectingPromise: Promise<{ client: TelegramClient; channel: InputEntity }> | null;
}

const DEFAULT_POOL_SIZE = 3;
let _pool: PoolSlot[] = [];
let _poolIndex = 0;

/** Returns true when all three MTProto env vars are present. */
export function isGramConfigured(): boolean {
    const { apiIdRaw, apiHash, sessionString } = getGramConfig();
    const apiId = apiIdRaw ? parseInt(apiIdRaw, 10) : NaN;
    return Number.isFinite(apiId) && apiId > 0 && !!apiHash && !!sessionString;
}

// ─── Connection Pool & Auto-Reconnect ────────────────────────────────────────

/**
 * Resolves a connected MTProto client and channel peer from the connection pool.
 * Distributes concurrent requests across pooled connections (round-robin) and
 * automatically reconnects any connection if it drops or gets disconnected.
 */
export async function getGramClientWithChannel(): Promise<{ client: TelegramClient; channel: InputEntity }> {
    if (!isGramConfigured()) {
        throw new Error(
            '[gramjs] MTProto not configured. ' +
            'Set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION_STRING.'
        );
    }

    const { apiIdRaw, apiHash, sessionString, chatId } = getGramConfig();
    const apiId = apiIdRaw ? parseInt(apiIdRaw, 10) : NaN;

    if (!Number.isFinite(apiId) || apiId <= 0 || !apiHash || !sessionString || !chatId) {
        throw new Error('[gramjs] TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION_STRING, and TELEGRAM_CHAT_ID are required.');
    }

    const configuredSize = parseInt(process.env.TELEGRAM_POOL_SIZE || `${DEFAULT_POOL_SIZE}`, 10);
    const poolSize = Number.isFinite(configuredSize) && configuredSize > 0 ? Math.min(8, configuredSize) : DEFAULT_POOL_SIZE;

    // Initialize pool slots
    while (_pool.length < poolSize) {
        _pool.push({ client: null, channel: null, connectingPromise: null });
    }

    // Pick slot via round-robin to balance load across pooled sockets
    const slotIdx = _poolIndex % poolSize;
    _poolIndex = (_poolIndex + 1) % poolSize;
    const slot = _pool[slotIdx];

    // If slot is healthy and connected, return instantly
    if (slot.client?.connected && slot.channel) {
        return { client: slot.client, channel: slot.channel };
    }

    // If slot is currently connecting/reconnecting, wait for it
    if (slot.connectingPromise) {
        return await slot.connectingPromise;
    }

    // Auto-reconnect / Initialize slot
    slot.connectingPromise = (async () => {
        try {
            if (slot.client && !slot.client.connected) {
                // Reconnect dropped connection socket
                console.log(`[gramjs] Auto-reconnecting connection pool slot #${slotIdx + 1}...`);
                await slot.client.connect();
            } else if (!slot.client) {
                // Spawn new connection socket
                let stringSession: StringSession;
                try {
                    stringSession = new StringSession(sessionString);
                } catch (error: any) {
                    throw new Error(`[gramjs] Invalid TELEGRAM_SESSION_STRING: (${error?.message || error})`);
                }

                const client = new TelegramClient(stringSession, apiId, apiHash, {
                    connectionRetries: 5,
                    retryDelay: 1000,
                    autoReconnect: true,
                });
                await client.connect();
                slot.client = client;
                console.log(`[gramjs] MTProto pool connection #${slotIdx + 1} online ✓`);
            }

            if (!slot.channel && slot.client) {
                slot.channel = await slot.client.getInputEntity(chatId);
            }

            return { client: slot.client!, channel: slot.channel! };
        } catch (err) {
            console.error(`[gramjs] Pool connection #${slotIdx + 1} failed:`, err);
            slot.client = null;
            slot.channel = null;
            throw err;
        } finally {
            slot.connectingPromise = null;
        }
    })();

    return await slot.connectingPromise;
}

/** Legacy singleton getter — wraps the pool for backwards compatibility. */
export async function getGramClient(): Promise<TelegramClient> {
    const { client } = await getGramClientWithChannel();
    return client;
}

/** Legacy channel getter — wraps the pool for backwards compatibility. */
async function getChannel(client: TelegramClient): Promise<InputEntity> {
    const { channel } = await getGramClientWithChannel();
    return channel;
}

/** Deletes a stored file message from the Telegram channel using MTProto */
export async function deleteMessageViaGram(messageId: number): Promise<boolean> {
    if (!messageId || !isGramConfigured()) return false;
    try {
        const { client, channel } = await getGramClientWithChannel();
        await client.deleteMessages(channel, [messageId], { revoke: true });
        console.log(`[gramjs] Auto-deleted channel message ${messageId} ✓`);
        return true;
    } catch (error) {
        console.error(`[gramjs] Failed to delete channel message ${messageId}:`, error);
        return false;
    }
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
    caption = '',
    onProgress?: (percent: number, uploadedBytes: number, totalBytes: number) => void
): Promise<GramUploadResult> {
    const { client, channel } = await getGramClientWithChannel();

    // Scale parallel workers with file size (more workers = faster large uploads)
    const workers =
        fileSize > 500 * 1024 * 1024 ? 16  // > 500 MB
            : fileSize > 100 * 1024 * 1024 ? 8   // > 100 MB
            : fileSize > 10  * 1024 * 1024 ? 4   // > 10 MB
            : 1;                                   // small

    const file = new CustomFile(fileName, fileSize, '', fileBuffer);

    let lastProgressTime = Date.now();
    let lastUploadedBytes = 0;

    const message = await client.sendFile(channel, {
        file,
        caption,
        parseMode: 'html',
        // forceDocument keeps the original file intact (no re-encoding)
        // and works consistently for every MIME type including video/gif.
        forceDocument: true,
        workers,
        progressCallback: (progress: number) => {
            const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
            const uploadedBytes = Math.round(progress * fileSize);

            const now = Date.now();
            const timeDiff = (now - lastProgressTime) / 1000;

            // Log chunk progress updates every 250ms for server diagnostic monitoring
            if (timeDiff >= 0.25 || percent === 100) {
                const bytesDiff = uploadedBytes - lastUploadedBytes;
                const speedBytesPerSec = timeDiff > 0 ? bytesDiff / timeDiff : 0;
                const speedMb = (speedBytesPerSec / (1024 * 1024)).toFixed(1);
                console.log(`[gramjs] MTProto chunk upload: ${percent}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(fileSize / (1024 * 1024)).toFixed(1)} MB) @ ${speedMb} MB/s`);

                lastProgressTime = now;
                lastUploadedBytes = uploadedBytes;
            }

            if (onProgress) {
                onProgress(percent, uploadedBytes, fileSize);
            }
        },
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
    const { client, channel } = await getGramClientWithChannel();

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
