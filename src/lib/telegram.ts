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

async function sendViaBotApi(
  token: string,
  chatId: string,
  method: string,
  fieldName: string,
  file: Blob,
  fileName: string,
  caption?: string
): Promise<any> {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append(fieldName, file, fileName);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

export async function uploadToTelegram(file: Blob, fileName: string, caption?: string, mediaType: 'photo' | 'animation' | 'video' = 'photo'): Promise<TelegramFileResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Telegram credentials not configured');
  }

  // For photos larger than 10 MB, skip sendPhoto and go straight to sendDocument
  // to avoid Telegram silently failing or returning an error.
  const useDocumentDirectly = mediaType === 'photo' && file.size > BOT_PHOTO_MAX;

  let data: any;
  let usedDocument = useDocumentDirectly;

  if (!useDocumentDirectly) {
    // Try the natural media method first (sendPhoto / sendVideo / sendAnimation)
    const methodMap: Record<string, { method: string; field: string }> = {
      photo:     { method: 'sendPhoto',     field: 'photo' },
      animation: { method: 'sendAnimation', field: 'animation' },
      video:     { method: 'sendVideo',     field: 'video' },
    };
    const { method, field } = methodMap[mediaType];
    data = await sendViaBotApi(token, chatId, method, field, file, fileName, caption);

    // If Telegram rejects it (e.g. file too large for the media type), fall back to document
    if (!data.ok) {
      console.warn(`[telegram] ${method} failed (${data.description}), retrying as sendDocument`);
      usedDocument = true;
    }
  }

  if (usedDocument) {
    data = await sendViaBotApi(token, chatId, 'sendDocument', 'document', file, fileName, caption);
  }

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  // Extract file_id from whichever field Telegram returned
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
    // Photos are returned as an array of sizes — pick the largest
    const largest = result.photo[result.photo.length - 1];
    fileId = largest.file_id;
    fileUniqueId = largest.file_unique_id;
  } else {
    throw new Error('Telegram response did not contain a recognisable file field');
  }

  return { file_id: fileId, file_unique_id: fileUniqueId };
}

export async function getTelegramFileUrl(fileId: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('Telegram token not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  const filePath = data.result.file_path;
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

export async function sendMessage(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML', replyMarkup?: any): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: false,
      reply_markup: replyMarkup
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    console.error(`Telegram sendMessage error: ${data.description}`);
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

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) {
    console.error(`Telegram ${method} error: ${data.description}`);
    throw new Error(`Telegram ${method} failed: ${data.description}`);
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

  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert || false
    }),
  });
}

export async function editMessageText(chatId: number | string, messageId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML', replyMarkup?: any): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: parseMode,
      reply_markup: replyMarkup
    }),
  });
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
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      console.log(`[telegram] Successfully deleted channel message ${messageId} via Bot API`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[telegram] Failed to delete channel message ${messageId}:`, error);
    return false;
  }
}
