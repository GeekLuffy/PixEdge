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
}

export async function uploadToTelegram(file: Blob, fileName: string, caption?: string): Promise<TelegramFileResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Telegram credentials not configured');
  }

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', file, fileName);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  // Telegram returns an array of sizes, we take the largest one
  const photos = data.result.photo;
  const largestPhoto = photos[photos.length - 1];

  return {
    file_id: largestPhoto.file_id,
    file_unique_id: largestPhoto.file_unique_id,
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

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
}

export async function sendMediaToChannel(fileId: string, caption: string, mediaType: 'photo' | 'animation' = 'photo'): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const method = mediaType === 'animation' ? 'sendAnimation' : 'sendPhoto';
  const body: any = {
    chat_id: chatId,
    caption,
    parse_mode: 'HTML'
  };

  if (mediaType === 'animation') {
    body.animation = fileId;
  } else {
    body.photo = fileId;
  }

  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
