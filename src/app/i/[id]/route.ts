import { NextRequest, NextResponse } from 'next/server';
import { getImage, incrementViews, incrementDownloads, purgeImage } from '@/lib/db';
import { getTelegramFileUrl } from '@/lib/telegram';
import { isGramConfigured, streamFileViaGram } from '@/lib/gramjs';

export const runtime = 'nodejs';
export const maxDuration = 300; // allow long streaming for large files

function parseRangeHeader(rangeHeader: string | null, fileSize: number): { start: number; end: number } | null {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;
    const parts = rangeHeader.replace('bytes=', '').split('-');
    const startStr = parts[0].trim();
    const endStr = parts[1].trim();

    let start: number;
    let end: number;

    if (startStr === '' && endStr !== '') {
        const suffixLength = parseInt(endStr, 10);
        if (isNaN(suffixLength) || suffixLength <= 0) return null;
        start = Math.max(0, fileSize - suffixLength);
        end = fileSize - 1;
    } else if (startStr !== '' && endStr === '') {
        start = parseInt(startStr, 10);
        end = fileSize - 1;
    } else {
        start = parseInt(startStr, 10);
        end = parseInt(endStr, 10);
    }

    if (isNaN(start) || isNaN(end) || start < 0 || start > end || (fileSize > 0 && start >= fileSize)) {
        return null;
    }

    if (fileSize > 0) {
        end = Math.min(end, fileSize - 1);
    }

    return { start, end };
}

function isBotCrawler(req: NextRequest): boolean {
    const userAgent = req.headers.get('user-agent') || '';
    const botPattern = /bot|crawler|spider|facebookexternalhit|whatsapp|telegrambot|twitterbot|slackbot|discordbot|curl|wget|python|node-fetch|axios|fetch|go-http-client/i;
    return botPattern.test(userAgent);
}

export async function HEAD(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: rawId } = await params;
    const hasExtension = rawId.includes('.');
    const id = hasExtension ? rawId.split('.')[0] : rawId;

    try {
        const record = await getImage(id);
        if (!record) return new NextResponse(null, { status: 404 });

        const ext = record.metadata?.type?.startsWith('video/') ? '.mp4' : '.jpg';
        const contentType = record.metadata?.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');
        const fileSize = record.metadata?.size || 0;

        const headers = new Headers({
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
        });
        if (fileSize) headers.set('Content-Length', fileSize.toString());

        return new NextResponse(null, { status: 200, headers });
    } catch {
        return new NextResponse(null, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: rawId } = await params;

    const hasExtension = rawId.includes('.');
    const id = hasExtension ? rawId.split('.')[0] : rawId;

    try {
        const record = await getImage(id);

        if (!record) {
            return new NextResponse('Image not found', { status: 404 });
        }

        // Detect TelegramBot to serve raw content for better previews
        const userAgent = req.headers.get('user-agent') || '';
        const isTelegramBot = userAgent.toLowerCase().includes('telegrambot');
        const accept = req.headers.get('accept') || '';
        const serveRaw = hasExtension || (!accept.includes('text/html') && !isTelegramBot);

        // Password Protection Verification
        if (record.password_hash) {
            const cookiePass = req.cookies.get(`pe_pass_${id}`)?.value;
            const queryPass = req.nextUrl.searchParams.get('password') || req.nextUrl.searchParams.get('pass');
            const headerPass = req.headers.get('x-media-password');

            const candidate = queryPass || headerPass || '';
            let authorized = false;

            if (cookiePass && cookiePass === record.password_hash) {
                authorized = true;
            } else if (candidate) {
                const crypto = await import('crypto');
                const candHash = crypto.createHash('sha256').update(candidate.trim()).digest('hex');
                if (candHash === record.password_hash) {
                    authorized = true;
                }
            }

            if (!authorized) {
                if (serveRaw) {
                    return new NextResponse('Unauthorized: Password protected link', { status: 401 });
                }

                // Render Password Protection Lock Screen
                const lockHtml = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protected Media | PixEdge</title>
  <style>
    :root {
      --bg-color: #09090b;
      --card-bg: rgba(22, 22, 29, 0.92);
      --text-main: #f4f4f5;
      --text-muted: #a1a1aa;
      --border-color: rgba(139, 92, 246, 0.25);
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-color);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--text-main);
      padding: 1.5rem;
    }
    .lock-card {
      width: 100%;
      max-width: 400px;
      background: var(--card-bg);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 2.5rem;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }
    .lock-icon {
      width: 64px;
      height: 64px;
      background: rgba(139, 92, 246, 0.15);
      color: #8b5cf6;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem 0; }
    p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.75rem; line-height: 1.5; }
    .pin-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      color: #fff;
      font-size: 1.05rem;
      letter-spacing: 2px;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      outline: none;
      box-sizing: border-box;
      margin-bottom: 1rem;
    }
    .btn-unlock {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(139, 92, 246, 0.35);
    }
    .error-msg {
      color: #f87171;
      font-size: 0.85rem;
      margin-top: 0.75rem;
      display: none;
    }
  </style>
</head>
<body>
  <div class="lock-card">
    <div class="lock-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </div>
    <h1>Protected Link</h1>
    <p>This media link is protected with a secret PIN or password by the owner.</p>
    <form id="unlockForm">
      <input type="password" id="passInput" class="pin-input" placeholder="Enter PIN or Password" autofocus required />
      <button type="submit" class="btn-unlock">Unlock & View Media</button>
      <div id="errorMsg" class="error-msg">Incorrect PIN or password</div>
    </form>
  </div>
  <script>
    document.getElementById('unlockForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = document.getElementById('passInput').value.trim();
      const err = document.getElementById('errorMsg');
      err.style.display = 'none';
      try {
        const res = await fetch('/api/v1/info/${id}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pass })
        });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          err.innerText = data.error || 'Incorrect password';
          err.style.display = 'block';
        }
      } catch {
        err.innerText = 'Unlock failed. Try again.';
        err.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;

                return new NextResponse(lockHtml, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }
        }

        const rangeHeader = req.headers.get('range');
        const downloadParam = req.nextUrl.searchParams.get('download') || req.nextUrl.searchParams.get('dl');
        const isExplicitDownload = downloadParam === '1' || downloadParam === 'true';
        const isBot = isBotCrawler(req);

        // Increment counts & check self-destruct triggers (only for real human users, ignore bot crawlers)
        if (!isBot) {
            if (isExplicitDownload) {
                await incrementDownloads(id);
                if (record.burn_after_download) {
                    purgeImage(id).catch(err => console.error('Self destruct burn_after_download error:', err));
                }
            } else if (serveRaw && (!rangeHeader || rangeHeader.startsWith('bytes=0-'))) {
                await incrementViews(id);
                if (record.burn_after_view) {
                    // Purge after serving raw media to browser so image renders cleanly on screen
                    purgeImage(id).catch(err => console.error('Self destruct burn_after_view error:', err));
                }
            }
        }

        // ── v2 path: gramjs MTProto streaming (true 1 MB-chunk streaming with Range support) ──────
        if (record.message_id && isGramConfigured()) {
            if (serveRaw) {
                try {
                    const fileSizeHint = record.metadata?.size || 0;
                    const parsedRange = fileSizeHint ? parseRangeHeader(rangeHeader, fileSizeHint) : null;

                    const gramInfo = await streamFileViaGram(
                        record.message_id,
                        parsedRange || undefined
                    );

                    const { stream, contentType, fileSize, fileName, isPartial, start, end, contentLength } = gramInfo;

                    const status = isPartial ? 206 : 200;
                    const headers = new Headers({
                        'Content-Type': contentType,
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    });

                    if (isPartial && start !== undefined && end !== undefined) {
                        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                        headers.set('Content-Length', (contentLength ?? (end - start + 1)).toString());
                    } else {
                        if (fileSize) headers.set('Content-Length', fileSize.toString());
                    }

                    const defaultExt = record.metadata?.type?.startsWith('video/') ? '.mp4' : (record.metadata?.type?.startsWith('audio/') ? '.mp3' : '.jpg');
                    const finalFileName = fileName || `${id}${defaultExt}`;
                    const dispositionType = isExplicitDownload ? 'attachment' : 'inline';
                    headers.set('Content-Disposition', `${dispositionType}; filename="${finalFileName}"`);

                    return new Response(stream, { status, headers });
                } catch (gramErr) {
                    console.error('[gramjs] stream error, falling back to Bot API:', gramErr);
                    // fall through to Bot API below
                }
            }
        }

        // ── v1 path: Bot API redirect / proxy (original behaviour with Range support) ───────────
        const fileUrl = await getTelegramFileUrl(record.telegram_file_id);

        const proxyImage = async () => {
            const fetchHeaders: Record<string, string> = {};
            if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

            const response = await fetch(fileUrl, { headers: fetchHeaders });
            const blob = await response.blob();
            const headers = new Headers();
            headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
            headers.set('Accept-Ranges', 'bytes');
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');

            if (response.headers.get('Content-Range')) {
                headers.set('Content-Range', response.headers.get('Content-Range')!);
            }
            if (response.headers.get('Content-Length')) {
                headers.set('Content-Length', response.headers.get('Content-Length')!);
            }

            const defaultExt = record.metadata?.type?.startsWith('video/') ? '.mp4' : (record.metadata?.type?.startsWith('audio/') ? '.mp3' : '.jpg');
            const finalFileName = `${id}${defaultExt}`;
            const dispositionType = isExplicitDownload ? 'attachment' : 'inline';
            headers.set('Content-Disposition', `${dispositionType}; filename="${finalFileName}"`);

            return new NextResponse(blob, { status: response.status, headers });
        };

        if (serveRaw) {
            return proxyImage();
        }

        // Increment views for HTML page view (only for real human users)
        if (!isBot) {
            await incrementViews(id);
        }

        const isVideo = !!record.metadata?.type?.startsWith('video/');
        const isAudio = !!record.metadata?.type?.startsWith('audio/');
        const isMedia = isVideo || isAudio;
        const ext = isVideo ? '.mp4' : (isAudio ? '.mp3' : '.jpg');
        const proxiedImgSrc = `/i/${id}${ext}`;
        const views = record.views || 0;
        const downloads = record.downloads || 0;
        const formattedDate = new Date(record.created_at).toLocaleDateString();
        const formattedSize = record.metadata?.size ? (record.metadata.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown';
        const expiresAt = record.expires_at || 0;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'https://pixedge.vercel.app');
        const fullPageUrl = `${baseUrl}/i/${id}`;

        return new NextResponse(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PixEdge | ${id}</title>
                <meta property="og:title" content="PixEdge Media">
                <meta property="og:site_name" content="PixEdge">
                ${isVideo
                ? `<meta property="og:type" content="video.other">
                   <meta property="og:video" content="${proxiedImgSrc}">
                   <meta property="og:video:type" content="${record.metadata?.type || 'video/mp4'}">
                   <meta property="og:video:width" content="1280">
                   <meta property="og:video:height" content="720">`
                : isAudio
                ? `<meta property="og:type" content="music.song">
                   <meta property="og:audio" content="${proxiedImgSrc}">
                   <meta property="og:audio:type" content="${record.metadata?.type || 'audio/mpeg'}">`
                : `<meta property="og:type" content="website">
                   <meta property="og:image" content="${proxiedImgSrc}">`
            }
                <meta name="twitter:card" content="summary_large_image">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; }
                    body { 
                        margin: 0; 
                        background: #09090b; 
                        color: #f4f4f5; 
                        font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        min-height: 100vh; 
                        overflow: hidden; 
                        user-select: none;
                    }
                    .player-wrapper {
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100vw;
                        height: 100vh;
                        padding: 80px 20px 90px;
                    }
                    .media-container {
                        position: relative;
                        max-width: 92vw;
                        max-height: 80vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    img {
                        max-width: 100%;
                        max-height: 78vh;
                        object-fit: contain;
                        border-radius: 14px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08);
                        background: #000;
                        cursor: zoom-in;
                        transition: transform 0.25s ease;
                    }
                    img.zoomed { transform: scale(1.6); cursor: zoom-out; }

                    /* Custom Video Player Styles */
                    .custom-player-container {
                        position: relative;
                        max-width: 92vw;
                        max-height: 80vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 18px;
                        overflow: hidden;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1);
                        background: #000;
                    }
                    .custom-player-container video {
                        max-width: 100%;
                        max-height: 78vh;
                        display: block;
                        object-fit: contain;
                        border-radius: 18px;
                        cursor: pointer;
                    }
                    .big-play-btn {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) scale(1);
                        width: 68px;
                        height: 68px;
                        border-radius: 50%;
                        background: rgba(18, 18, 24, 0.75);
                        backdrop-filter: blur(16px);
                        -webkit-backdrop-filter: blur(16px);
                        border: 1px solid rgba(139, 92, 246, 0.4);
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        z-index: 20;
                        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(139, 92, 246, 0.3);
                        opacity: 0.9;
                    }
                    .big-play-btn:hover {
                        transform: translate(-50%, -50%) scale(1.1);
                        background: rgba(139, 92, 246, 0.85);
                        border-color: #c4b5fd;
                        box-shadow: 0 10px 35px rgba(139, 92, 246, 0.6);
                    }
                    .big-play-btn.hidden {
                        opacity: 0;
                        pointer-events: none;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    .custom-controls {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 24px 18px 14px;
                        background: linear-gradient(to top, rgba(9, 9, 11, 0.95) 0%, rgba(9, 9, 11, 0.6) 60%, transparent 100%);
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        z-index: 25;
                        transition: opacity 0.3s ease;
                        user-select: none;
                    }
                    .custom-controls.autohide {
                        opacity: 0;
                        pointer-events: none;
                    }
                    .progress-bar-wrap {
                        position: relative;
                        width: 100%;
                        height: 6px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 10px;
                        cursor: pointer;
                        transition: height 0.15s ease;
                    }
                    .progress-bar-wrap:hover {
                        height: 9px;
                    }
                    .buffered-bar {
                        position: absolute;
                        top: 0;
                        left: 0;
                        height: 100%;
                        background: rgba(255, 255, 255, 0.35);
                        border-radius: 10px;
                        width: 0%;
                    }
                    .played-bar {
                        position: absolute;
                        top: 0;
                        left: 0;
                        height: 100%;
                        background: linear-gradient(90deg, #8b5cf6 0%, #c084fc 100%);
                        border-radius: 10px;
                        width: 0%;
                        box-shadow: 0 0 12px rgba(139, 92, 246, 0.7);
                    }
                    .scrub-handle {
                        position: absolute;
                        top: 50%;
                        left: 0%;
                        transform: translate(-50%, -50%);
                        width: 13px;
                        height: 13px;
                        border-radius: 50%;
                        background: #ffffff;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6), 0 0 10px #8b5cf6;
                        opacity: 0;
                        transition: opacity 0.15s ease;
                    }
                    .progress-bar-wrap:hover .scrub-handle {
                        opacity: 1;
                    }
                    .controls-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                    }
                    .controls-left, .controls-right {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .ctrl-btn {
                        background: transparent;
                        border: none;
                        color: #e4e4e7;
                        width: 32px;
                        height: 32px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        padding: 0;
                    }
                    .ctrl-btn:hover {
                        color: #ffffff;
                        background: rgba(255, 255, 255, 0.15);
                        transform: scale(1.05);
                    }
                    .ctrl-btn.active {
                        color: #c4b5fd;
                        background: rgba(139, 92, 246, 0.25);
                    }
                    .time-display {
                        font-size: 12px;
                        color: #d4d4d8;
                        font-weight: 500;
                        margin-left: 6px;
                        letter-spacing: 0.3px;
                        white-space: nowrap;
                    }
                    .speed-btn {
                        font-size: 11px;
                        font-weight: 700;
                        padding: 3px 8px;
                        width: auto;
                        height: 26px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 6px;
                        color: #f4f4f5;
                    }
                    .speed-btn:hover {
                        background: rgba(139, 92, 246, 0.3);
                        border-color: #8b5cf6;
                        color: #c4b5fd;
                    }
                    .volume-container {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        position: relative;
                    }
                    .vol-slider {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 60px;
                        height: 4px;
                        background: rgba(255, 255, 255, 0.25);
                        border-radius: 4px;
                        outline: none;
                        cursor: pointer;
                        transition: width 0.2s ease, opacity 0.2s ease;
                    }
                    .vol-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background: #ffffff;
                        cursor: pointer;
                        box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
                    }

                    /* Custom Audio Player Card */
                    .audio-player-card {
                        background: rgba(18, 18, 24, 0.85);
                        backdrop-filter: blur(24px);
                        -webkit-backdrop-filter: blur(24px);
                        border: 1px solid rgba(139, 92, 246, 0.3);
                        border-radius: 28px;
                        padding: 32px 28px;
                        width: 90vw;
                        max-width: 420px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.2);
                    }
                    .vinyl-disc-wrap {
                        width: 160px;
                        height: 160px;
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    }
                    .vinyl-disc {
                        width: 100%;
                        height: 100%;
                        border-radius: 50%;
                        background: radial-gradient(circle, #27272a 0%, #18181b 30%, #09090b 70%, #18181b 100%);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 0 4px rgba(255, 255, 255, 0.06), 0 0 25px rgba(139, 92, 246, 0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        border: 2px solid rgba(255, 255, 255, 0.08);
                    }
                    .vinyl-disc.spinning {
                        animation: spin 6s linear infinite;
                    }
                    @keyframes spin {
                        100% { transform: rotate(360deg); }
                    }
                    .vinyl-center {
                        width: 54px;
                        height: 54px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 0 15px rgba(139, 92, 246, 0.6);
                    }
                    .vinyl-dot {
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        background: #09090b;
                        border: 2px solid rgba(255, 255, 255, 0.4);
                    }
                    .equalizer-wrap {
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                        gap: 4px;
                        height: 24px;
                        margin-bottom: 12px;
                    }
                    .eq-bar {
                        width: 3px;
                        height: 6px;
                        background: #8b5cf6;
                        border-radius: 3px;
                        transition: height 0.2s ease;
                    }
                    .equalizer-wrap.playing .eq-bar:nth-child(1) { animation: eqPulse 0.8s ease infinite alternate; }
                    .equalizer-wrap.playing .eq-bar:nth-child(2) { animation: eqPulse 1.1s ease infinite alternate; animation-delay: 0.1s; }
                    .equalizer-wrap.playing .eq-bar:nth-child(3) { animation: eqPulse 0.7s ease infinite alternate; animation-delay: 0.2s; }
                    .equalizer-wrap.playing .eq-bar:nth-child(4) { animation: eqPulse 1.3s ease infinite alternate; animation-delay: 0.15s; }
                    .equalizer-wrap.playing .eq-bar:nth-child(5) { animation: eqPulse 0.9s ease infinite alternate; animation-delay: 0.25s; }
                    .equalizer-wrap.playing .eq-bar:nth-child(6) { animation: eqPulse 1.2s ease infinite alternate; animation-delay: 0.05s; }
                    .equalizer-wrap.playing .eq-bar:nth-child(7) { animation: eqPulse 0.8s ease infinite alternate; animation-delay: 0.18s; }
                    .equalizer-wrap.playing .eq-bar:nth-child(8) { animation: eqPulse 1.0s ease infinite alternate; animation-delay: 0.3s; }
                    @keyframes eqPulse {
                        0% { height: 4px; background: #8b5cf6; }
                        100% { height: 22px; background: #c084fc; }
                    }
                    .audio-meta {
                        margin-bottom: 14px;
                    }
                    .audio-title {
                        font-size: 1.15rem;
                        font-weight: 700;
                        color: #f4f4f5;
                        margin-bottom: 4px;
                    }
                    .audio-subtitle {
                        font-size: 0.8rem;
                        color: #a1a1aa;
                    }
                    .audio-time-row {
                        width: 100%;
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                        color: #a1a1aa;
                        margin-bottom: 14px;
                    }
                    .audio-controls-row {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 16px;
                        width: 100%;
                    }
                    .audio-play-btn {
                        width: 52px;
                        height: 52px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: none;
                        cursor: pointer;
                        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
                        transition: all 0.2s ease;
                    }
                    .audio-play-btn:hover {
                        transform: scale(1.08);
                        box-shadow: 0 10px 30px rgba(139, 92, 246, 0.7);
                    }

                    .toolbar { 
                        position: fixed; 
                        top: 20px; 
                        left: 50%; 
                        transform: translateX(-50%); 
                        display: flex; 
                        align-items: center;
                        gap: 8px; 
                        background: rgba(18, 18, 22, 0.75); 
                        backdrop-filter: blur(16px); 
                        -webkit-backdrop-filter: blur(16px);
                        padding: 6px 10px; 
                        border-radius: 100px; 
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                        z-index: 100;
                    }
                    .expiry-pill {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(139, 92, 246, 0.12);
                        border: 1px solid rgba(139, 92, 246, 0.28);
                        color: #c4b5fd;
                        padding: 4px 12px;
                        border-radius: 50px;
                        font-size: 12px;
                        font-weight: 500;
                        height: 32px;
                        white-space: nowrap;
                    }
                    .expiry-pill b {
                        color: #ffffff;
                        font-weight: 700;
                        letter-spacing: 0.5px;
                    }
                    .btn-extend-trigger {
                        background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%);
                        border: 1px solid rgba(139, 92, 246, 0.5);
                        color: #e9d5ff;
                        font-size: 11px;
                        font-weight: 700;
                        padding: 3px 10px;
                        border-radius: 20px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        font-family: inherit;
                    }
                    .btn-extend-trigger:hover {
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        color: #ffffff;
                        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                        transform: translateY(-1px);
                    }
                    .info-bar { 
                        position: fixed; 
                        bottom: 24px; 
                        left: 50%; 
                        transform: translateX(-50%); 
                        background: rgba(18, 18, 22, 0.75); 
                        backdrop-filter: blur(16px); 
                        -webkit-backdrop-filter: blur(16px);
                        padding: 10px 22px; 
                        border-radius: 100px; 
                        display: flex; 
                        align-items: center; 
                        gap: 24px; 
                        font-size: 13px; 
                        color: #a1a1aa; 
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                        z-index: 100;
                        white-space: nowrap;
                    }
                    .info-item { display: flex; align-items: center; gap: 6px; }
                    .info-item b { color: #f4f4f5; font-weight: 600; }
                    .badge {
                        background: rgba(139, 92, 246, 0.2);
                        color: #c4b5fd;
                        border: 1px solid rgba(139, 92, 246, 0.3);
                        padding: 2px 8px;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                    }
                    
                    button, a.btn { 
                        color: #f4f4f5; 
                        text-decoration: none; 
                        font-size: 13px; 
                        font-weight: 500;
                        padding: 7px 16px; 
                        border-radius: 50px; 
                        transition: all 0.2s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        border: none;
                        background: transparent;
                        cursor: pointer;
                        font-family: inherit;
                        height: 32px;
                    }
                    a.btn-primary, button.btn-primary { 
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); 
                        color: white; 
                        box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
                        font-weight: 600;
                    }
                    a.btn-primary:hover, button.btn-primary:hover { 
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
                    }
                    a.btn-secondary, button.btn-secondary { 
                        background: rgba(255, 255, 255, 0.08); 
                        color: #d4d4d8; 
                    }
                    a.btn-secondary:hover, button.btn-secondary:hover { 
                        background: rgba(255, 255, 255, 0.16); 
                        color: #ffffff; 
                    }
                    .icon-btn {
                        width: 32px;
                        height: 32px;
                        padding: 0;
                        border-radius: 50%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(255, 255, 255, 0.08);
                        color: #d4d4d8;
                        border: none;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .icon-btn:hover {
                        background: rgba(255, 255, 255, 0.16);
                        color: #ffffff;
                        transform: scale(1.05);
                    }
                    .burn-pill {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        background: rgba(239, 68, 68, 0.15);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        color: #fca5a5;
                        padding: 4px 12px;
                        border-radius: 50px;
                        font-size: 12px;
                        font-weight: 600;
                        height: 32px;
                    }
                    .toast {
                        position: fixed;
                        top: 24px;
                        left: 50%;
                        transform: translateX(-50%) translateY(-100px);
                        background: rgba(18, 18, 22, 0.95);
                        border: 1px solid rgba(139, 92, 246, 0.4);
                        color: #f4f4f5;
                        padding: 10px 20px;
                        border-radius: 100px;
                        font-size: 13px;
                        font-weight: 500;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                        z-index: 1000;
                        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        pointer-events: none;
                    }
                    .toast.show {
                        transform: translateX(-50%) translateY(0);
                    }

                    .modal-backdrop {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.7);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 500;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.2s ease;
                    }
                    .modal-backdrop.active {
                        opacity: 1;
                        pointer-events: auto;
                    }
                    .modal-card {
                        background: rgba(18, 18, 24, 0.95);
                        border: 1px solid rgba(139, 92, 246, 0.3);
                        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(139, 92, 246, 0.15);
                        border-radius: 24px;
                        padding: 24px;
                        width: 90%;
                        max-width: 360px;
                        text-align: center;
                    }
                    .modal-card h3 {
                        margin: 0 0 6px 0;
                        font-size: 1.1rem;
                        font-weight: 700;
                    }
                    .modal-card p {
                        margin: 0 0 16px 0;
                        font-size: 0.8rem;
                        color: #a1a1aa;
                    }
                    .modal-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        margin-bottom: 16px;
                    }
                    .modal-option {
                        background: rgba(255, 255, 255, 0.06);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 10px;
                        color: #f4f4f5;
                        font-size: 0.82rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.15s ease;
                    }
                    .modal-option:hover {
                        background: rgba(139, 92, 246, 0.2);
                        border-color: rgba(139, 92, 246, 0.4);
                        color: #c4b5fd;
                    }
                    .modal-option-never {
                        grid-column: span 2;
                        background: rgba(16, 185, 129, 0.15);
                        border-color: rgba(16, 185, 129, 0.3);
                        color: #34d399;
                    }
                    .modal-option-never:hover {
                        background: rgba(16, 185, 129, 0.25);
                        border-color: rgba(16, 185, 129, 0.5);
                    }
                </style>
            </head>
            <body>
                <div class="toast" id="toast">Copied to clipboard!</div>

                <div class="modal-backdrop" id="extendModal">
                    <div class="modal-card">
                        <h3>⏳ Extend Link Expiry</h3>
                        <p>Select duration to extend this upload link:</p>
                        <div class="modal-grid">
                            <button class="modal-option" onclick="extendExpiry(3600)">+ 1 Hour</button>
                            <button class="modal-option" onclick="extendExpiry(86400)">+ 24 Hours</button>
                            <button class="modal-option" onclick="extendExpiry(604800)">+ 7 Days</button>
                            <button class="modal-option" onclick="extendExpiry(2592000)">+ 30 Days</button>
                            <button class="modal-option modal-option-never" onclick="extendExpiry(-1)">✨ Set to Never Expire</button>
                        </div>
                        <button class="btn btn-secondary" style="width: 100%; justify-content: center; height: 38px;" onclick="closeExtendModal()">Cancel</button>
                    </div>
                </div>

                <div class="modal-backdrop" id="qrModal" onclick="closeQrModal()">
                    <div class="modal-card" onclick="event.stopPropagation()">
                        <h3>📱 QR Code</h3>
                        <p>Scan to view this media on mobile:</p>
                        <div style="background: white; padding: 12px; border-radius: 12px; display: inline-block; margin-bottom: 16px;">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fullPageUrl)}" width="180" height="180" alt="QR Code">
                        </div>
                        <button class="btn btn-secondary" style="width: 100%; justify-content: center;" onclick="closeQrModal()">Close</button>
                    </div>
                </div>

                <div class="toolbar">
                    <a href="/" class="btn btn-secondary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        Upload
                    </a>

                    <div class="expiry-pill" id="expiryBadge" style="display: ${expiresAt ? 'inline-flex' : 'none'};">
                        <span>⏳ Expires in: <b id="countdownTimer">--:--:--</b></span>
                        <button class="btn-extend-trigger" onclick="openExtendModal()">+ Extend</button>
                    </div>

                    ${record.burn_after_view
                        ? `<div class="burn-pill">🔥 Burns After View</div>`
                        : record.burn_after_download
                        ? `<div class="burn-pill">🔥 Burns After Download</div>`
                        : ''
                    }

                    <button class="btn btn-secondary" onclick="openQrModal()">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        QR
                    </button>

                    <button class="btn btn-secondary" id="shareBtn" onclick="shareMedia()" title="Share Media (S)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        Share
                    </button>

                    <button class="btn btn-secondary" id="copyBtn" onclick="copyLink()">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy Link
                    </button>
                    <button class="icon-btn" id="fullscreenBtn" title="Toggle Fullscreen (F)" onclick="toggleFullscreen()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    </button>
                    <a href="${proxiedImgSrc}?download=1" download class="btn btn-primary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download
                    </a>
                </div>

                <div class="player-wrapper">
                    ${isVideo ? `
                        <div class="custom-player-container" id="playerContainer">
                            <video id="mediaElement" src="${proxiedImgSrc}" playsinline preload="metadata" onclick="togglePlay()"></video>
                            
                            <!-- Big Center Play Button -->
                            <div class="big-play-btn" id="bigPlayBtn" onclick="togglePlay()">
                                <svg id="bigPlayIcon" width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </div>

                            <!-- Custom Floating Controls Bar -->
                            <div class="custom-controls" id="customControls">
                                <div class="progress-bar-wrap" id="progressWrap" onclick="seek(event)">
                                    <div class="buffered-bar" id="bufferedBar"></div>
                                    <div class="played-bar" id="playedBar"></div>
                                    <div class="scrub-handle" id="scrubHandle"></div>
                                </div>

                                <div class="controls-row">
                                    <div class="controls-left">
                                        <button class="ctrl-btn" id="playBtn" onclick="togglePlay()" title="Play/Pause (Space)">
                                            <svg id="playIcon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                        </button>
                                        <button class="ctrl-btn" onclick="skip(-10)" title="Rewind 10s (J / ←)">
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
                                        </button>
                                        <button class="ctrl-btn" onclick="skip(10)" title="Forward 10s (L / →)">
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
                                        </button>
                                        <div class="volume-container">
                                            <button class="ctrl-btn" id="volBtn" onclick="toggleMute()" title="Mute/Unmute (M)">
                                                <svg id="volIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                                            </button>
                                            <input type="range" class="vol-slider" id="volSlider" min="0" max="1" step="0.05" value="1" oninput="setVolume(this.value)">
                                        </div>
                                        <div class="time-display" id="timeDisplay">0:00 / 0:00</div>
                                    </div>

                                    <div class="controls-right">
                                        <button class="ctrl-btn speed-btn" id="speedBtn" onclick="cycleSpeed()" title="Playback Speed">1x</button>
                                        <button class="ctrl-btn" id="loopBtn" onclick="toggleLoop()" title="Toggle Loop">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                        </button>
                                        <button class="ctrl-btn" id="pipBtn" onclick="togglePiP()" title="Picture in Picture (P)">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="10" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.3"/></svg>
                                        </button>
                                        <button class="ctrl-btn" onclick="toggleFullscreen()" title="Fullscreen (F)">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : isAudio ? `
                        <div class="audio-player-card" id="audioPlayerCard">
                            <audio id="mediaElement" src="${proxiedImgSrc}" preload="metadata"></audio>
                            
                            <div class="vinyl-disc-wrap">
                                <div class="vinyl-disc" id="vinylDisc">
                                    <div class="vinyl-center">
                                        <div class="vinyl-dot"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="equalizer-wrap" id="eqWrap">
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                            </div>

                            <div class="audio-meta">
                                <div class="audio-title">/${id}</div>
                                <div class="audio-subtitle">Audio Track • ${formattedSize}</div>
                            </div>

                            <div class="progress-bar-wrap" id="progressWrap" onclick="seek(event)" style="margin: 16px 0 10px;">
                                <div class="buffered-bar" id="bufferedBar"></div>
                                <div class="played-bar" id="playedBar"></div>
                                <div class="scrub-handle" id="scrubHandle"></div>
                            </div>

                            <div class="audio-time-row">
                                <span id="timeDisplay">0:00 / 0:00</span>
                            </div>

                            <div class="audio-controls-row">
                                <button class="ctrl-btn speed-btn" id="speedBtn" onclick="cycleSpeed()" title="Playback Speed">1x</button>
                                <button class="ctrl-btn" onclick="skip(-10)" title="Rewind 10s">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
                                </button>
                                <button class="audio-play-btn" id="playBtn" onclick="togglePlay()" title="Play/Pause">
                                    <svg id="playIcon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                </button>
                                <button class="ctrl-btn" onclick="skip(10)" title="Forward 10s">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
                                </button>
                                <button class="ctrl-btn" id="loopBtn" onclick="toggleLoop()" title="Toggle Loop">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                </button>
                            </div>

                            <div class="volume-container" style="justify-content: center; margin-top: 18px; width: 100%;">
                                <button class="ctrl-btn" id="volBtn" onclick="toggleMute()" title="Mute/Unmute">
                                    <svg id="volIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                                </button>
                                <input type="range" class="vol-slider" id="volSlider" min="0" max="1" step="0.05" value="1" oninput="setVolume(this.value)" style="width: 130px; opacity: 1;">
                            </div>
                        </div>
                    ` : `
                        <div class="media-container" id="mediaContainer">
                            <img id="mediaElement" src="${proxiedImgSrc}" alt="PixEdge Media" onclick="toggleZoom(this)">
                        </div>
                    `}
                </div>

                <div class="info-bar">
                    <div class="info-item"><b>Res</b> <span id="resolutionVal" class="badge">Detecting...</span></div>
                    <div class="info-item"><b>Views</b> ${views}</div>
                    <div class="info-item"><b>Downloads</b> ${downloads}</div>
                    <div class="info-item"><b>Size</b> ${formattedSize}</div>
                    <div class="info-item"><b>Date</b> ${formattedDate}</div>
                </div>

                <script>
                    const media = document.getElementById('mediaElement');
                    const resVal = document.getElementById('resolutionVal');
                    const isVideo = ${isVideo};
                    const isAudio = ${isAudio};
                    const isMedia = isVideo || isAudio;
                    let targetExpiresAt = ${expiresAt || 0};

                    // ── Live Countdown Ticking Timer ──────────────────────────────────────────
                    function updateCountdown() {
                        const badge = document.getElementById('expiryBadge');
                        if (!targetExpiresAt || targetExpiresAt <= 0) {
                            if (badge) badge.style.display = 'none';
                            return;
                        }

                        const now = Date.now();
                        const diff = targetExpiresAt - now;

                        if (diff <= 0) {
                            document.getElementById('countdownTimer').textContent = 'EXPIRED';
                            location.reload();
                            return;
                        }

                        if (badge) badge.style.display = 'inline-flex';

                        const seconds = Math.floor((diff / 1000) % 60);
                        const minutes = Math.floor((diff / (1000 * 60)) % 60);
                        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

                        let str = '';
                        if (days > 0) str += \`\${days}d \`;
                        str += \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;

                        const timerEl = document.getElementById('countdownTimer');
                        if (timerEl) timerEl.textContent = str;
                    }

                    if (targetExpiresAt > 0) {
                        updateCountdown();
                        setInterval(updateCountdown, 1000);
                    }

                    // ── Extend Expiry Modal Handlers ─────────────────────────────────────
                    function openExtendModal() {
                        document.getElementById('extendModal').classList.add('active');
                    }

                    function closeExtendModal() {
                        document.getElementById('extendModal').classList.remove('active');
                    }

                    function openQrModal() {
                        document.getElementById('qrModal').classList.add('active');
                    }

                    function closeQrModal() {
                        document.getElementById('qrModal').classList.remove('active');
                    }

                    async function extendExpiry(seconds) {
                        try {
                            const res = await fetch('/api/user/extend-expiry', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: '${id}', durationSeconds: seconds })
                            });
                            const json = await res.json();
                            if (json.success) {
                                if (seconds === -1) {
                                    targetExpiresAt = 0;
                                    showToast('Upload set to Never Expire!');
                                } else if (json.newExpiresAt) {
                                    targetExpiresAt = json.newExpiresAt;
                                    showToast('Expiry extended successfully!');
                                }
                                updateCountdown();
                                closeExtendModal();
                            } else {
                                showToast(json.error?.message || 'Must be logged in as owner to extend.');
                            }
                        } catch {
                            showToast('Failed to extend expiry.');
                        }
                    }

                    // ── 1. Media Controller (Video & Audio) ──────────────────────
                    const playBtn = document.getElementById('playBtn');
                    const playIcon = document.getElementById('playIcon');
                    const bigPlayBtn = document.getElementById('bigPlayBtn');
                    const playedBar = document.getElementById('playedBar');
                    const bufferedBar = document.getElementById('bufferedBar');
                    const scrubHandle = document.getElementById('scrubHandle');
                    const timeDisplay = document.getElementById('timeDisplay');
                    const speedBtn = document.getElementById('speedBtn');
                    const loopBtn = document.getElementById('loopBtn');
                    const volBtn = document.getElementById('volBtn');
                    const volSlider = document.getElementById('volSlider');
                    const vinylDisc = document.getElementById('vinylDisc');
                    const eqWrap = document.getElementById('eqWrap');
                    const customControls = document.getElementById('customControls');
                    const playerContainer = document.getElementById('playerContainer');

                    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                    let currentSpeedIdx = 2; // 1x

                    function formatTime(seconds) {
                        if (!seconds || isNaN(seconds)) return '0:00';
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
                        return \`\${mins}:\${secs}\`;
                    }

                    function togglePlay() {
                        if (!media) return;
                        if (media.paused || media.ended) {
                            media.play();
                        } else {
                            media.pause();
                        }
                    }

                    function updatePlayState() {
                        const isPaused = media.paused;
                        const playSvg = '<svg id="playIcon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
                        const pauseSvg = '<svg id="playIcon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

                        if (playBtn) playBtn.innerHTML = isPaused ? playSvg : pauseSvg;
                        if (bigPlayBtn) {
                            if (isPaused) {
                                bigPlayBtn.classList.remove('hidden');
                            } else {
                                bigPlayBtn.classList.add('hidden');
                            }
                        }
                        if (vinylDisc) {
                            if (isPaused) vinylDisc.classList.remove('spinning');
                            else vinylDisc.classList.add('spinning');
                        }
                        if (eqWrap) {
                            if (isPaused) eqWrap.classList.remove('playing');
                            else eqWrap.classList.add('playing');
                        }
                    }

                    function seek(e) {
                        if (!media || !media.duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        media.currentTime = Math.max(0, Math.min(pos * media.duration, media.duration));
                    }

                    function skip(seconds) {
                        if (!media) return;
                        media.currentTime = Math.max(0, Math.min(media.currentTime + seconds, media.duration || 0));
                    }

                    function cycleSpeed() {
                        if (!media) return;
                        currentSpeedIdx = (currentSpeedIdx + 1) % speeds.length;
                        const spd = speeds[currentSpeedIdx];
                        media.playbackRate = spd;
                        if (speedBtn) speedBtn.textContent = spd + 'x';
                        showToast('Speed: ' + spd + 'x');
                    }

                    function toggleLoop() {
                        if (!media) return;
                        media.loop = !media.loop;
                        if (loopBtn) {
                            if (media.loop) loopBtn.classList.add('active');
                            else loopBtn.classList.remove('active');
                        }
                        showToast(media.loop ? 'Loop Enabled' : 'Loop Disabled');
                    }

                    function setVolume(val) {
                        if (!media) return;
                        const v = parseFloat(val);
                        media.volume = v;
                        media.muted = v === 0;
                        updateVolIcon();
                        localStorage.setItem('pixedge_volume', v);
                    }

                    function toggleMute() {
                        if (!media) return;
                        media.muted = !media.muted;
                        updateVolIcon();
                        localStorage.setItem('pixedge_muted', media.muted);
                    }

                    function updateVolIcon() {
                        if (!volBtn) return;
                        const muted = media.muted || media.volume === 0;
                        if (volSlider) volSlider.value = muted ? 0 : media.volume;

                        if (muted) {
                            volBtn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
                        } else {
                            volBtn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
                        }
                    }

                    async function togglePiP() {
                        if (!media || !document.pictureInPictureEnabled) return;
                        try {
                            if (document.pictureInPictureElement) {
                                await document.exitPictureInPicture();
                            } else {
                                await media.requestPictureInPicture();
                            }
                        } catch (err) {
                            showToast('PiP not supported');
                        }
                    }

                    if (isMedia && media) {
                        media.addEventListener('play', updatePlayState);
                        media.addEventListener('pause', updatePlayState);
                        media.addEventListener('ended', updatePlayState);

                        media.addEventListener('timeupdate', () => {
                            if (!media.duration) return;
                            const pct = (media.currentTime / media.duration) * 100;
                            if (playedBar) playedBar.style.width = pct + '%';
                            if (scrubHandle) scrubHandle.style.left = pct + '%';
                            if (timeDisplay) timeDisplay.textContent = formatTime(media.currentTime) + ' / ' + formatTime(media.duration);
                        });

                        media.addEventListener('progress', () => {
                            if (!media.duration || !media.buffered.length) return;
                            const buff = (media.buffered.end(media.buffered.length - 1) / media.duration) * 100;
                            if (bufferedBar) bufferedBar.style.width = buff + '%';
                        });

                        media.addEventListener('loadedmetadata', () => {
                            const duration = Math.round(media.duration);
                            const mins = Math.floor(duration / 60);
                            const secs = (duration % 60).toString().padStart(2, '0');
                            const durStr = duration ? ' (' + mins + ':' + secs + ')' : '';

                            if (isVideo) {
                                resVal.textContent = media.videoWidth + ' × ' + media.videoHeight + durStr;
                            } else if (isAudio) {
                                resVal.textContent = 'Audio' + durStr;
                            }
                            if (timeDisplay) timeDisplay.textContent = '0:00 / ' + formatTime(media.duration);
                        });

                        // Saved Volume Restoration
                        const savedVol = localStorage.getItem('pixedge_volume');
                        const savedMute = localStorage.getItem('pixedge_muted');
                        if (savedVol !== null) media.volume = parseFloat(savedVol);
                        if (savedMute !== null) media.muted = savedMute === 'true';
                        updateVolIcon();

                        // Controls autohide timer for video
                        if (isVideo && playerContainer && customControls) {
                            let hideTimer;
                            const showControls = () => {
                                customControls.classList.remove('autohide');
                                clearTimeout(hideTimer);
                                if (!media.paused) {
                                    hideTimer = setTimeout(() => {
                                        customControls.classList.add('autohide');
                                    }, 3000);
                                }
                            };
                            playerContainer.addEventListener('mousemove', showControls);
                            playerContainer.addEventListener('mouseleave', () => {
                                if (!media.paused) customControls.classList.add('autohide');
                            });
                        }
                    } else if (media) {
                        if (media.complete) {
                            resVal.textContent = media.naturalWidth + ' × ' + media.naturalHeight;
                        } else {
                            media.addEventListener('load', () => {
                                resVal.textContent = media.naturalWidth + ' × ' + media.naturalHeight;
                            });
                        }
                    }

                    // ── 2. Image Zooming ──────────────────────────────────────────
                    function toggleZoom(img) {
                        img.classList.toggle('zoomed');
                    }

                    // ── 3. Native Web Share & Copy Link Toast ──────────────────────
                    async function shareMedia() {
                        if (navigator.share) {
                            try {
                                await navigator.share({
                                    title: 'PixEdge | ${id}',
                                    text: 'Check out this media on PixEdge',
                                    url: window.location.href,
                                });
                            } catch (err) {
                                if (err && err.name !== 'AbortError') {
                                    copyLink();
                                }
                            }
                        } else {
                            copyLink();
                        }
                    }

                    function copyLink() {
                        navigator.clipboard.writeText(window.location.href).then(() => {
                            showToast('Direct link copied to clipboard!');
                        });
                    }

                    function showToast(msg) {
                        const toast = document.getElementById('toast');
                        toast.textContent = msg;
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 2500);
                    }

                    // ── 4. Fullscreen Support ──────────────────────────────────────
                    function toggleFullscreen() {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(() => {});
                        } else {
                            if (document.exitFullscreen) document.exitFullscreen();
                        }
                    }

                    // ── 5. Global Keyboard Shortcuts ─────────────────────────────
                    document.addEventListener('keydown', (e) => {
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                        const key = e.key.toLowerCase();

                        if (key === 'f') {
                            e.preventDefault();
                            toggleFullscreen();
                        } else if ((key === ' ' || key === 'k') && isMedia) {
                            e.preventDefault();
                            togglePlay();
                        } else if ((key === 'arrowleft' || key === 'j') && isMedia) {
                            e.preventDefault();
                            skip(-5);
                        } else if ((key === 'arrowright' || key === 'l') && isMedia) {
                            e.preventDefault();
                            skip(5);
                        } else if (key === 'arrowup' && isMedia) {
                            e.preventDefault();
                            setVolume(Math.min(1, media.volume + 0.1));
                        } else if (key === 'arrowdown' && isMedia) {
                            e.preventDefault();
                            setVolume(Math.max(0, media.volume - 0.1));
                        } else if (key === 'm' && isMedia) {
                            e.preventDefault();
                            toggleMute();
                        } else if (key === 'p' && isVideo) {
                            e.preventDefault();
                            togglePiP();
                        } else if (key === 's') {
                            e.preventDefault();
                            shareMedia();
                        } else if (key === 'c') {
                            e.preventDefault();
                            copyLink();
                        }
                    });
                </script>
            </body>
            </html>`,
            {
                headers: { 'Content-Type': 'text/html' },
            }
        );
    } catch (error) {
        console.error('Redirection error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
