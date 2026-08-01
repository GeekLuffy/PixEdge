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

        // Increment counts & check self-destruct triggers
        if (isExplicitDownload) {
            await incrementDownloads(id);
            if (record.burn_after_download) {
                await purgeImage(id);
            }
        } else if (serveRaw && (!rangeHeader || rangeHeader.startsWith('bytes=0-'))) {
            await incrementViews(id);
            if (record.burn_after_view) {
                await purgeImage(id);
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

                    const defaultExt = record.metadata?.type?.startsWith('video/') ? '.mp4' : '.jpg';
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

            const defaultExt = record.metadata?.type?.startsWith('video/') ? '.mp4' : '.jpg';
            const finalFileName = `${id}${defaultExt}`;
            const dispositionType = isExplicitDownload ? 'attachment' : 'inline';
            headers.set('Content-Disposition', `${dispositionType}; filename="${finalFileName}"`);

            return new NextResponse(blob, { status: response.status, headers });
        };

        if (serveRaw) {
            return proxyImage();
        }

        // Increment views for HTML page view
        await incrementViews(id);

        // Self-destruct HTML page view (purges record so page can only be viewed once)
        if (record.burn_after_view) {
            await purgeImage(id);
        }

        const ext = record.metadata?.type?.startsWith('video/') ? '.mp4' : '.jpg';
        const proxiedImgSrc = `/i/${id}${ext}`;
        const views = record.views || 0;
        const downloads = record.downloads || 0;
        const formattedDate = new Date(record.created_at).toLocaleDateString();
        const formattedSize = record.metadata?.size ? (record.metadata.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown';
        const expiresAt = record.expires_at || 0;

        return new NextResponse(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PixEdge | ${id}</title>
                <meta property="og:title" content="PixEdge Media">
                <meta property="og:site_name" content="PixEdge">
                ${record.metadata?.type?.startsWith('video/')
                ? `<meta property="og:type" content="video.other">
                   <meta property="og:video" content="${proxiedImgSrc}">
                   <meta property="og:video:type" content="${record.metadata.type}">
                   <meta property="og:video:width" content="1280">
                   <meta property="og:video:height" content="720">`
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
                    img, video {
                        max-width: 100%;
                        max-height: 78vh;
                        object-fit: contain;
                        border-radius: 14px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08);
                        background: #000;
                    }
                    img { cursor: zoom-in; transition: transform 0.25s ease; }
                    img.zoomed { transform: scale(1.6); cursor: zoom-out; }

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
                        transition: all 0.2s ease;
                    }
                    .icon-btn:hover {
                        background: rgba(255, 255, 255, 0.18);
                        color: #ffffff;
                    }
                    .toast {
                        position: fixed;
                        top: 80px;
                        left: 50%;
                        transform: translateX(-50%) translateY(-10px);
                        opacity: 0;
                        pointer-events: none;
                        background: #18181b;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        color: #f4f4f5;
                        padding: 8px 16px;
                        border-radius: 50px;
                        font-size: 13px;
                        font-weight: 500;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        z-index: 200;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    }
                    .toast.show {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }

                    /* Extend Expiry Modal Overlay */
                    .modal-backdrop {
                        position: fixed;
                        inset: 0;
                        background: rgba(9, 9, 11, 0.82);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 999;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.25s ease;
                    }
                    .modal-backdrop.active {
                        opacity: 1;
                        pointer-events: auto;
                    }
                    .modal-card {
                        background: linear-gradient(145deg, rgba(22, 22, 29, 0.96) 0%, rgba(32, 24, 50, 0.96) 100%);
                        border: 1px solid rgba(139, 92, 246, 0.3);
                        border-radius: 24px;
                        padding: 28px 24px;
                        width: 90%;
                        max-width: 380px;
                        box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(139, 92, 246, 0.2);
                        text-align: center;
                    }
                    .modal-card h3 { 
                        margin: 0 0 6px 0; 
                        font-size: 1.25rem; 
                        font-weight: 800; 
                        color: #ffffff; 
                        letter-spacing: -0.5px;
                    }
                    .modal-card p { 
                        margin: 0 0 20px 0; 
                        font-size: 0.88rem; 
                        color: #a1a1aa; 
                    }
                    .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
                    .modal-option {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: #f4f4f5;
                        padding: 11px;
                        border-radius: 14px;
                        font-size: 0.88rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                    }
                    .modal-option:hover {
                        background: rgba(139, 92, 246, 0.22);
                        border-color: rgba(139, 92, 246, 0.45);
                        color: #e9d5ff;
                        transform: translateY(-2px);
                    }
                    .modal-option-never {
                        grid-column: span 2;
                        background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.18) 100%);
                        border: 1px solid rgba(16, 185, 129, 0.35);
                        color: #34d399;
                        font-weight: 700;
                    }
                    .modal-option-never:hover {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: #ffffff;
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                        transform: translateY(-2px);
                    }
                    
                    @media (max-width: 640px) {
                        .info-bar { font-size: 11px; gap: 12px; padding: 8px 16px; }
                        .toolbar { padding: 6px 10px; gap: 6px; }
                        a.btn, button { font-size: 12px; padding: 6px 12px; }
                    }
                </style>
            </head>
            <body>
                <div class="toast" id="toast">Copied to clipboard!</div>

                <!-- Extend Expiry Modal -->
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

                <div class="toolbar">
                    <a href="/" class="btn btn-secondary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        Upload
                    </a>

                    <!-- Live Ticking Expiry Badge -->
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
                    <div class="media-container" id="mediaContainer">
                        ${record.metadata?.type?.startsWith('video/')
                ? `<video id="mediaElement" src="${proxiedImgSrc}" controls autoplay loop playsinline></video>`
                : `<img id="mediaElement" src="${proxiedImgSrc}" alt="PixEdge Media" onclick="toggleZoom(this)">`
            }
                    </div>
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
                    const isVideo = media.tagName.toLowerCase() === 'video';
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

                    // ── 1. Resolution & Metadata Detection ──────────────────────
                    if (isVideo) {
                        media.addEventListener('loadedmetadata', () => {
                            const w = media.videoWidth;
                            const h = media.videoHeight;
                            const duration = Math.round(media.duration);
                            const mins = Math.floor(duration / 60);
                            const secs = (duration % 60).toString().padStart(2, '0');
                            const durStr = duration ? \` \${mins}:\${secs}\` : '';
                            resVal.textContent = \`\${w} × \${h}\${durStr ? ' (' + durStr + ')' : ''}\`;
                        });

                        // ── 2. Volume & Mute Persistence ────────────────────────
                        const savedVol = localStorage.getItem('pixedge_volume');
                        const savedMute = localStorage.getItem('pixedge_muted');
                        if (savedVol !== null) media.volume = parseFloat(savedVol);
                        if (savedMute !== null) media.muted = savedMute === 'true';

                        media.addEventListener('volumechange', () => {
                            localStorage.setItem('pixedge_volume', media.volume);
                            localStorage.setItem('pixedge_muted', media.muted);
                        });
                    } else {
                        if (media.complete) {
                            resVal.textContent = \`\${media.naturalWidth} × \${media.naturalHeight}\`;
                        } else {
                            media.addEventListener('load', () => {
                                resVal.textContent = \`\${media.naturalWidth} × \${media.naturalHeight}\`;
                            });
                        }
                    }

                    // ── 3. Image Zooming ──────────────────────────────────────────
                    function toggleZoom(img) {
                        img.classList.toggle('zoomed');
                    }

                    // ── 4. Copy Link Toast ────────────────────────────────────────
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

                    // ── 5. Fullscreen Support ──────────────────────────────────────
                    function toggleFullscreen() {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(() => {});
                        } else {
                            if (document.exitFullscreen) document.exitFullscreen();
                        }
                    }

                    // ── 6. Keyboard Shortcuts ────────────────────────────────────
                    document.addEventListener('keydown', (e) => {
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                        const key = e.key.toLowerCase();

                        if (key === 'f') {
                            e.preventDefault();
                            toggleFullscreen();
                        } else if (key === ' ' && isVideo) {
                            e.preventDefault();
                            if (media.paused) media.play(); else media.pause();
                        } else if (key === 'm' && isVideo) {
                            e.preventDefault();
                            media.muted = !media.muted;
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
