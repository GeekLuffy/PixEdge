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

export async function uploadToTelegram(file: Blob, fileName: string, caption?: string, mediaType: 'photo' | 'animation' | 'video' = 'photo'): Promise<TelegramFileResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Telegram credentials not configured');
  }

  const formData = new FormData();
  formData.append('chat_id', chatId);

  let method = 'sendPhoto';
  let fieldName = 'photo';
  if (mediaType === 'animation') {
    method = 'sendAnimation';
    fieldName = 'animation';
  } else if (mediaType === 'video') {
    method = 'sendVideo';
    fieldName = 'video';
  }

  formData.append(fieldName, file, fileName);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  let fileId = '';
  let fileUniqueId = '';

  if (mediaType === 'animation') {
    // For animations, it's a single object in 'animation' or 'document' field
    const fileInfo = data.result.animation || data.result.document;
    fileId = fileInfo.file_id;
    fileUniqueId = fileInfo.file_unique_id;
  } else if (mediaType === 'video') {
    const fileInfo = data.result.video || data.result.document;
    fileId = fileInfo.file_id;
    fileUniqueId = fileInfo.file_unique_id;
  } else {
    // For photos, it's an array of sizes
    const photos = data.result.photo;
    const largestPhoto = photos[photos.length - 1];
    fileId = largestPhoto.file_id;
    fileUniqueId = largestPhoto.file_unique_id;
  }

  return {
    file_id: fileId,
    file_unique_id: fileUniqueId,
  };
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
