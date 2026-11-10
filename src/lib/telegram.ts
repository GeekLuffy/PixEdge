export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function redactSensitiveTokens(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/bot[0-9]+:[A-Za-z0-9_-]+/gi, 'bot[REDACTED_BOT_TOKEN]')
    .replace(/(https?:\/\/api\.telegram\.org\/file\/bot)[^/]+/gi, '$1[REDACTED_BOT_TOKEN]');
}

export interface TelegramFileResult {
  file_id: string;
  file_unique_id: string;
  file_path?: string;
  file_size?: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    caption?: string;
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      file_size: number;
      width: number;
      height: number;
    }>;
    document?: {
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      mime_type?: string;
      file_size: number;
    };
    animation?: {
      file_id: string;
      file_unique_id: string;
      file_size: number;
      mime_type?: string;
    };
    video?: {
      file_id: string;
      file_unique_id: string;
      file_size: number;
      mime_type?: string;
      duration?: number;
      width?: number;
      height?: number;
    };
    reply_to_message?: {
      message_id: number;
      photo?: Array<{
        file_id: string;
        file_unique_id: string;
        file_size: number;
        width: number;
        height: number;
      }>;
      document?: {
        file_id: string;
        file_unique_id: string;
        file_name?: string;
        mime_type?: string;
        file_size: number;
      };
      animation?: {
        file_id: string;
        file_unique_id: string;
        file_size: number;
        mime_type?: string;
      };
      video?: {
        file_id: string;
        file_unique_id: string;
        file_size: number;
        mime_type?: string;
        duration?: number;
        width?: number;
        height?: number;
      };
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data: string;
  };
}

// Bot API hard limits:
//   sendPhoto     → ~10 MB (Telegram rejects larger photos silently or with error)
//   sendVideo     → 50 MB
//   sendAnimation → 50 MB
//   sendDocument  → 50 MB (safe fallback for any file type)
const BOT_PHOTO_MAX = 10 * 1024 * 1024; // 10 MB

// Telegram guarantees getFile file_path links remain valid for at least 1 hour.
// Caching for 45 minutes avoids hitting getFile on every media/avatar request and prevents 429s.
const FILE_PATH_CACHE_TTL_MS = 45 * 60 * 1000;
const MAX_FILE_PATH_CACHE = 2000;
const filePathCache = new Map<string, { filePath: string; expiresAt: number }>();
const inFlightFileLookups = new Map<string, Promise<string>>();

export class TelegramApiError extends Error {
  statusCode: number;
  retryAfter?: number;

  constructor(message: string, statusCode = 502, retryAfter?: number) {
    super(message);
    this.name = 'TelegramApiError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, TelegramApiError.prototype);
  }
}

export interface RetryFetchOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  /** Timeout for receiving response headers (does not abort streaming bodies after headers arrive). */
  timeoutMs?: number;
}

const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_ABORTED',
]);

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const e = err as { code?: unknown; cause?: { code?: unknown } };
  if (typeof e.code === 'string') return e.code;
  if (e.cause && typeof e.cause.code === 'string') return e.cause.code;
  return '';
}

function isRetryableFetchError(err: unknown, wasInternalTimeout: boolean): boolean {
  if (wasInternalTimeout) return true;
  if (!err || typeof err !== 'object') return false;
  const code = getErrorCode(err);
  if (code && RETRYABLE_NETWORK_CODES.has(code)) return true;
  const e = err as { name?: unknown; message?: unknown };
  if (e.name === 'TypeError' && typeof e.message === 'string' && e.message.toLowerCase().includes('fetch failed')) {
    return true;
  }
  return false;
}

function parseRetryAfterMs(headerVal: string | null, retryAfterSeconds?: number): number | null {
  if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  if (!headerVal) return null;
  const parsed = Number(headerVal);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed * 1000;
  }
  return null;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit | (() => RequestInit) = {},
  options: RetryFetchOptions = {}
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 350;
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxWaitMs = 8000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resolvedInit = typeof init === 'function' ? init() : init;
    let internalController: AbortController | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let didTimeout = false;

    if (timeoutMs > 0 && !resolvedInit.signal) {
      internalController = new AbortController();
      timeoutHandle = setTimeout(() => {
        didTimeout = true;
        internalController?.abort();
      }, timeoutMs);
    }

    try {
      const response = await fetch(url, {
        ...resolvedInit,
        signal: resolvedInit.signal ?? internalController?.signal,
      });

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      if (RETRYABLE_HTTP_STATUSES.has(response.status) && attempt < maxRetries) {
        const retryAfterMs = response.status === 429
          ? parseRetryAfterMs(response.headers.get('Retry-After'))
          : null;

        if (retryAfterMs !== null && retryAfterMs > maxWaitMs) {
          return response;
        }

        await response.body?.cancel().catch(() => {});
        const backoff = retryAfterMs ?? Math.min(maxWaitMs, baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 150));
        await delay(backoff);
        continue;
      }

      return response;
    } catch (err) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      lastError = err;
      const externalAborted = Boolean(resolvedInit.signal?.aborted);
      if (!externalAborted && isRetryableFetchError(err, didTimeout) && attempt < maxRetries) {
        const backoff = Math.min(maxWaitMs, baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 150));
        await delay(backoff);
        continue;
      }

      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed after retries');
}

interface TelegramJsonPayload {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
}

async function parseTelegramJsonResponse(response: Response): Promise<TelegramJsonPayload> {
  const rawText = await response.text();
  if (!rawText) {
    return {
      ok: false,
      error_code: response.status || 502,
      description: response.statusText || 'Empty response from Telegram API',
    };
  }

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object' && typeof parsed.ok === 'boolean') {
      return {
        ...parsed,
        error_code: parsed.error_code ?? response.status,
      };
    }
  } catch {
    // Non-JSON upstream error page
  }

  return {
    ok: false,
    error_code: response.status || 502,
    description: response.statusText || `HTTP ${response.status}`,
  };
}

/**
 * Selects the safest Telegram Bot API upload method for a given MIME type and filename.
 * Non-JPEG/PNG images (WebP, AVIF, BMP, TIFF, SVG) and audio/unknown types go directly
 * via sendDocument to avoid Telegram IMAGE_PROCESS_FAILED rejections.
 */
export function resolveBotMediaType(
  mimeType?: string,
  fileName?: string
): 'photo' | 'animation' | 'video' | 'document' {
  const normalized = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (normalized === 'image/gif') return 'animation';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized === 'image/jpeg' || normalized === 'image/jpg' || normalized === 'image/png') {
    return 'photo';
  }

  if (!normalized || normalized === 'application/octet-stream') {
    const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
    if (ext === 'gif') return 'animation';
    if (ext === 'mp4' || ext === 'webm' || ext === 'mov' || ext === 'mkv' || ext === 'mpeg' || ext === '3gp') {
      return 'video';
    }
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
      return 'photo';
    }
  }

  return 'document';
}

async function sendViaBotApi(
  token: string,
  chatId: string,
  method: string,
  fieldName: string,
  file: Blob,
  fileName: string,
  caption?: string
): Promise<TelegramJsonPayload> {
  const response = await fetchWithRetry(
    `https://api.telegram.org/bot${token}/${method}`,
    () => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append(fieldName, file, fileName);
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }
      return {
        method: 'POST',
        body: formData,
      };
    },
    { maxRetries: 2, timeoutMs: 60000 }
  );
  return parseTelegramJsonResponse(response);
}

export async function uploadToTelegram(
  file: Blob,
  fileName: string,
  caption?: string,
  mediaType: 'photo' | 'animation' | 'video' | 'document' = 'photo'
): Promise<TelegramFileResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Telegram credentials not configured');
  }

  const useDocumentDirectly = mediaType === 'document' || (mediaType === 'photo' && file.size > BOT_PHOTO_MAX);

  let data: TelegramJsonPayload | undefined;
  let usedDocument = useDocumentDirectly;

  if (!useDocumentDirectly) {
    const methodMap: Record<'photo' | 'animation' | 'video', { method: string; field: string }> = {
      photo:     { method: 'sendPhoto',     field: 'photo' },
      animation: { method: 'sendAnimation', field: 'animation' },
      video:     { method: 'sendVideo',     field: 'video' },
    };
    const { method, field } = methodMap[mediaType];
    data = await sendViaBotApi(token, chatId, method, field, file, fileName, caption);

    if (!data.ok) {
      console.warn(`[telegram] ${method} failed (${data.description}), retrying as sendDocument`);
      usedDocument = true;
    }
  }

  if (usedDocument) {
    data = await sendViaBotApi(token, chatId, 'sendDocument', 'document', file, fileName, caption);
  }

  if (!data?.ok) {
    throw new TelegramApiError(
      `Telegram API error: ${data?.description || 'Upload failed'}`,
      data?.error_code || 502,
      data?.parameters?.retry_after
    );
  }

  const result = data.result;
  let fileId = '';
  let fileUniqueId = '';

  if (usedDocument || result.document) {
    fileId = result.document.file_id;
    fileUniqueId = result.document.file_unique_id;
  } else if (result.animation) {
    fileId = result.animation.file_id;
    fileUniqueId = result.animation.file_unique_id;
  } else if (result.video) {
    fileId = result.video.file_id;
    fileUniqueId = result.video.file_unique_id;
  } else if (result.photo) {
    const largest = result.photo[result.photo.length - 1];
    fileId = largest.file_id;
    fileUniqueId = largest.file_unique_id;
  } else {
    throw new Error('Telegram response did not contain a recognisable file field');
  }

  return { file_id: fileId, file_unique_id: fileUniqueId };
}

export function invalidateTelegramFileUrl(fileId: string): void {
  if (!fileId) return;
  filePathCache.delete(fileId);
}

export async function getTelegramFileUrl(
  fileId: string,
  options: { forceRefresh?: boolean } = {}
): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('Telegram token not configured');
  }

  const now = Date.now();
  if (!options.forceRefresh) {
    const cached = filePathCache.get(fileId);
    if (cached && cached.expiresAt > now) {
      return `https://api.telegram.org/file/bot${token}/${cached.filePath}`;
    }
    if (cached) {
      filePathCache.delete(fileId);
    }

    const existingLookup = inFlightFileLookups.get(fileId);
    if (existingLookup) {
      const filePath = await existingLookup;
      return `https://api.telegram.org/file/bot${token}/${filePath}`;
    }
  } else {
    filePathCache.delete(fileId);
  }

  const lookupPromise = (async (): Promise<string> => {
    const response = await fetchWithRetry(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
      {},
      { maxRetries: 3, baseDelayMs: 350, timeoutMs: 15000 }
    );
    const data = await parseTelegramJsonResponse(response);

    if (!data.ok || !data.result?.file_path) {
      throw new TelegramApiError(
        `Telegram API error: ${data.description || 'Failed to resolve file path'}`,
        data.error_code || (response.status >= 400 ? response.status : 502),
        data.parameters?.retry_after
      );
    }

    const filePath = data.result.file_path as string;

    if (filePathCache.size >= MAX_FILE_PATH_CACHE) {
      const oldestKey = filePathCache.keys().next().value;
      if (oldestKey !== undefined) {
        filePathCache.delete(oldestKey);
      }
    }
    filePathCache.set(fileId, {
      filePath,
      expiresAt: Date.now() + FILE_PATH_CACHE_TTL_MS,
    });

    return filePath;
  })();

  inFlightFileLookups.set(fileId, lookupPromise);
  try {
    const filePath = await lookupPromise;
    return `https://api.telegram.org/file/bot${token}/${filePath}`;
  } finally {
    if (inFlightFileLookups.get(fileId) === lookupPromise) {
      inFlightFileLookups.delete(fileId);
    }
  }
}

export async function sendMessage(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML', replyMarkup?: any): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const sanitizedText = redactSensitiveTokens(text);
    const response = await fetchWithRetry(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: sanitizedText,
          parse_mode: parseMode,
          disable_web_page_preview: true,
          link_preview_options: { is_disabled: true },
          reply_markup: replyMarkup
        }),
      },
      { maxRetries: 1, timeoutMs: 10000 }
    );

    const data = await parseTelegramJsonResponse(response);
    if (!data.ok) {
      console.error(`Telegram sendMessage error: ${data.description}`);
      return null;
    }
    return data.result;
  } catch (err) {
    console.error('Telegram sendMessage exception:', err);
    return null;
  }
}

export async function deleteTelegramMessage(chatId: number | string, messageId: number): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId || !messageId) return false;

  try {
    const response = await fetchWithRetry(
      `https://api.telegram.org/bot${token}/deleteMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
        }),
      },
      { maxRetries: 1, timeoutMs: 10000 }
    );

    const data = await parseTelegramJsonResponse(response);
    if (data.ok) {
      return true;
    }
    console.warn(`[telegram] deleteMessage warning (${messageId}): ${data.description}`);
    return false;
  } catch (error) {
    console.error(`[telegram] Failed to delete message ${messageId} in chat ${chatId}:`, error);
    return false;
  }
}

export async function sendMediaToChannel(fileId: string, caption: string, mediaType: 'photo' | 'animation' | 'video' | 'document' = 'photo'): Promise<TelegramFileResult | void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Missing token or chatId for sendMediaToChannel');
    return;
  }

  let method = 'sendPhoto';
  if (mediaType === 'animation') method = 'sendAnimation';
  if (mediaType === 'video') method = 'sendVideo';
  if (mediaType === 'document') method = 'sendDocument';

  const body: any = {
    chat_id: chatId,
    caption,
    parse_mode: 'HTML'
  };

  if (mediaType === 'animation') {
    body.animation = fileId;
  } else if (mediaType === 'video') {
    body.video = fileId;
  } else if (mediaType === 'document') {
    body.document = fileId;
  } else {
    body.photo = fileId;
  }

  const response = await fetchWithRetry(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { maxRetries: 2, timeoutMs: 15000 }
  );

  const data = await parseTelegramJsonResponse(response);
  if (!data.ok) {
    console.error(`Telegram ${method} error: ${data.description}`);
    throw new TelegramApiError(
      `Telegram ${method} failed: ${data.description}`,
      data.error_code || 502,
      data.parameters?.retry_after
    );
  }

  return data.result;
}

export async function sendLog(text: string): Promise<void> {
  const logChannelId = process.env.TELEGRAM_LOG_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID;
  if (!logChannelId) return;

  await sendMessage(logChannelId, text, 'HTML');
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetchWithRetry(
    `https://api.telegram.org/bot${token}/answerCallbackQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert || false
      }),
    },
    { maxRetries: 1, timeoutMs: 10000 }
  );
}

export async function editMessageText(chatId: number | string, messageId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML', replyMarkup?: any): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const sanitizedText = redactSensitiveTokens(text);
  await fetchWithRetry(
    `https://api.telegram.org/bot${token}/editMessageText`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: sanitizedText,
        parse_mode: parseMode,
        reply_markup: replyMarkup
      }),
    },
    { maxRetries: 1, timeoutMs: 10000 }
  );
}

// Automatically removes a media file message from the Telegram channel when an upload expires or gets deleted
export async function deleteChannelMediaMessage(messageId?: number): Promise<boolean> {
  if (!messageId) return false;

  // Try MTProto deletion first if configured
  try {
    const { isGramConfigured, deleteMessageViaGram } = await import('@/lib/gramjs');
    if (isGramConfigured()) {
      const ok = await deleteMessageViaGram(messageId);
      if (ok) return true;
    }
  } catch (err) {
    console.warn('[telegram] MTProto delete unavailable, trying Bot API');
  }

  // Fall back to Telegram Bot API deleteMessage
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return false;
  return await deleteTelegramMessage(chatId, messageId);
}

// Fetches the user's current profile picture from Telegram, downloads it securely on the server,
// uploads it to the Telegram storage channel, and returns a safe PixEdge direct URL.
// The raw Telegram bot token URL is NEVER exposed to clients or stored in Redis.
export async function getTelegramUserProfilePhoto(userId: number | string, baseUrl?: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const cleanUserId = userId.toString().trim();

  try {
    const { Redis } = await import('@upstash/redis');
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    let redis: any = null;
    if (redisUrl && redisToken) {
      redis = new Redis({ url: redisUrl, token: redisToken });
      const cachedAvatar: string | null = await redis.get(`user:custom_avatar:${cleanUserId}`);
      if (cachedAvatar) {
        if (!cachedAvatar.includes('api.telegram.org/file/bot')) {
          return cachedAvatar;
        }
        // Purge previously leaked bot token URL from Redis
        await redis.del(`user:custom_avatar:${cleanUserId}`);
      }
    }

    const res = await fetchWithRetry(
      `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${cleanUserId}&limit=1`,
      {},
      { maxRetries: 2, timeoutMs: 15000 }
    );
    const data = await parseTelegramJsonResponse(res);
    if (data.ok && data.result?.photos?.length > 0) {
      const photos = data.result.photos[0];
      // Pick highest resolution photo (last element)
      const fileId = photos[photos.length - 1].file_id;
      const fileUrl = await getTelegramFileUrl(fileId);
      // Download photo on the server directly (never pass bot token URL to browser)
      const downloadRes = await fetchWithRetry(fileUrl, {}, { maxRetries: 2, timeoutMs: 15000 });
      if (downloadRes.ok) {
        const photoArrayBuffer = await downloadRes.arrayBuffer();
        const photoBlob = new Blob([photoArrayBuffer], { type: 'image/jpeg' });
        const avatarFileName = `avatar-${cleanUserId}.jpg`;

        // Re-upload to PixEdge storage channel
        const uploadResult = await uploadToTelegram(photoBlob, avatarFileName, `Profile photo for user ${cleanUserId}`, 'photo');
        if (uploadResult?.file_id) {
          const avatarId = `avatar-${cleanUserId}`;
          const { saveImage } = await import('@/lib/db');
          await saveImage({
            id: avatarId,
            telegram_file_id: uploadResult.file_id,
            created_at: Date.now(),
            is_avatar: true,
            metadata: {
              size: photoArrayBuffer.byteLength,
              type: 'image/jpeg'
            }
          }, 'bot');

          const siteUrl = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://pixedge.vercel.app';
          const safeAvatarUrl = `${siteUrl}/i/${avatarId}.jpg`;

          if (redis) {
            await redis.set(`user:custom_avatar:${cleanUserId}`, safeAvatarUrl);
          }
          return safeAvatarUrl;
        }
      }
    }
  } catch (err) {
    console.error('[telegram] Failed to fetch and re-host user profile photo:', err);
  }
  return null;
}

export interface WebhookEnsureResult {
  ok: boolean;
  action: 'ok' | 'updated' | 'skipped' | 'error';
  expectedUrl?: string;
  previousUrl?: string;
  pendingUpdates?: number;
  lastError?: string | null;
  reason?: string;
}

const WEBHOOK_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const WEBHOOK_REHEAL_COOLDOWN_MS = 15 * 60 * 1000;
let lastWebhookCheckAt = 0;
let lastWebhookRepairAt = 0;
let lastWebhookResult: WebhookEnsureResult | null = null;
let inFlightWebhookEnsure: Promise<WebhookEnsureResult> | null = null;

function cleanEnvValue(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function resolvePublicBaseUrl(): string {
  const candidate = cleanEnvValue(process.env.NEXT_PUBLIC_BASE_URL) || cleanEnvValue(process.env.NEXTAUTH_URL);
  return candidate.replace(/\/+$/, '');
}

/**
 * Verifies the Telegram Bot webhook via getWebhookInfo and automatically calls setWebhook
 * if the webhook URL is missing, points to the wrong host, or is failing recent deliveries.
 */
export async function ensureTelegramWebhook(
  options: { force?: boolean; source?: string } = {}
): Promise<WebhookEnsureResult> {
  const now = Date.now();
  if (!options.force && lastWebhookResult && now - lastWebhookCheckAt < WEBHOOK_CHECK_INTERVAL_MS) {
    return lastWebhookResult;
  }

  if (inFlightWebhookEnsure) {
    return inFlightWebhookEnsure;
  }

  const runCheck = async (): Promise<WebhookEnsureResult> => {
    const token = cleanEnvValue(process.env.TELEGRAM_BOT_TOKEN);
    const webhookSecret = cleanEnvValue(process.env.TELEGRAM_WEBHOOK_SECRET);
    const baseUrl = resolvePublicBaseUrl();

    if (!token) {
      return { ok: false, action: 'skipped', reason: 'TELEGRAM_BOT_TOKEN is not configured' };
    }
    if (!webhookSecret) {
      return { ok: false, action: 'skipped', reason: 'TELEGRAM_WEBHOOK_SECRET is not configured' };
    }
    if (
      !baseUrl ||
      !baseUrl.startsWith('https://') ||
      baseUrl.includes('localhost') ||
      baseUrl.includes('127.0.0.1') ||
      baseUrl.includes('your-domain.com')
    ) {
      return { ok: false, action: 'skipped', reason: 'Valid HTTPS NEXT_PUBLIC_BASE_URL is required' };
    }

    const expectedUrl = `${baseUrl}/api/webhook/telegram`;

    try {
      const infoRes = await fetchWithRetry(
        `https://api.telegram.org/bot${token}/getWebhookInfo`,
        {},
        { maxRetries: 1, timeoutMs: 10000 }
      );
      const infoData = await parseTelegramJsonResponse(infoRes);
      if (!infoData.ok || !infoData.result) {
        const result: WebhookEnsureResult = {
          ok: false,
          action: 'error',
          expectedUrl,
          reason: infoData.description || 'Failed to query Telegram getWebhookInfo',
        };
        lastWebhookCheckAt = Date.now();
        lastWebhookResult = result;
        return result;
      }

      const info = infoData.result;
      const currentUrl = typeof info.url === 'string' ? info.url.trim() : '';
      const pendingUpdates = Number(info.pending_update_count || 0);
      const lastErrorDate = Number(info.last_error_date || 0);
      const lastErrorMessage = typeof info.last_error_message === 'string' ? info.last_error_message : null;
      const nowSec = Math.floor(Date.now() / 1000);
      const hasRecentError = Boolean(lastErrorMessage) && lastErrorDate > 0 && (nowSec - lastErrorDate) < 15 * 60;

      const urlMismatch = currentUrl !== expectedUrl;
      const needsDeliveryRepair =
        !urlMismatch &&
        hasRecentError &&
        (Date.now() - lastWebhookRepairAt >= WEBHOOK_REHEAL_COOLDOWN_MS) &&
        (
          pendingUpdates > 0 ||
          /401|unauthorized|wrong response|connection|timed out|ssl|certificate/i.test(lastErrorMessage || '')
        );

      if (!urlMismatch && !needsDeliveryRepair) {
        const result: WebhookEnsureResult = {
          ok: true,
          action: 'ok',
          expectedUrl,
          previousUrl: currentUrl,
          pendingUpdates,
          lastError: lastErrorMessage,
        };
        lastWebhookCheckAt = Date.now();
        lastWebhookResult = result;
        return result;
      }

      const setRes = await fetchWithRetry(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: expectedUrl,
            secret_token: webhookSecret,
            allowed_updates: ['message', 'callback_query'],
          }),
        },
        { maxRetries: 1, timeoutMs: 10000 }
      );
      const setData = await parseTelegramJsonResponse(setRes);

      if (!setData.ok) {
        const result: WebhookEnsureResult = {
          ok: false,
          action: 'error',
          expectedUrl,
          previousUrl: currentUrl,
          pendingUpdates,
          lastError: lastErrorMessage,
          reason: setData.description || 'setWebhook failed',
        };
        lastWebhookCheckAt = Date.now();
        lastWebhookResult = result;
        return result;
      }

      lastWebhookRepairAt = Date.now();
      lastWebhookCheckAt = Date.now();
      const result: WebhookEnsureResult = {
        ok: true,
        action: 'updated',
        expectedUrl,
        previousUrl: currentUrl,
        pendingUpdates,
        lastError: lastErrorMessage,
        reason: urlMismatch ? 'Webhook URL mismatch fixed' : 'Webhook re-registered after delivery error',
      };
      lastWebhookResult = result;

      const triggerSource = escapeHtml(options.source || 'auto');
      sendLog(
        `🔧 <b>Telegram Webhook Auto-Fixed</b>\n` +
        `Trigger: <code>${triggerSource}</code>\n` +
        `Previous: <code>${escapeHtml(currentUrl || '(empty)')}</code>\n` +
        `Active: <code>${escapeHtml(expectedUrl)}</code>`
      ).catch(() => {});

      return result;
    } catch (err: any) {
      const result: WebhookEnsureResult = {
        ok: false,
        action: 'error',
        expectedUrl,
        reason: err?.message || 'Unexpected error verifying webhook',
      };
      lastWebhookCheckAt = Date.now();
      lastWebhookResult = result;
      return result;
    }
  };

  inFlightWebhookEnsure = runCheck();
  try {
    return await inFlightWebhookEnsure;
  } finally {
    inFlightWebhookEnsure = null;
  }
}
