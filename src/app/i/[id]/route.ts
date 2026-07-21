import { NextRequest, NextResponse } from 'next/server';
import { getImage, incrementViews, incrementDownloads } from '@/lib/db';
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

        const rangeHeader = req.headers.get('range');

        // ── v2 path: gramjs MTProto streaming (true 1 MB-chunk streaming with Range support) ──────
        if (record.message_id && isGramConfigured()) {
            if (serveRaw) {
                if (hasExtension) await incrementDownloads(id);

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

                    if (fileName) {
                        headers.set('Content-Disposition', `inline; filename="${fileName}"`);
                    }

                    return new Response(stream, { status, headers });
                } catch (gramErr) {
                    console.error('[gramjs] stream error, falling back to Bot API:', gramErr);
                    // fall through to Bot API below
                }
            }
        }

        // ── v1 path: Bot API redirect / proxy (original behaviour with Range support) ───────────
        const fileUrl = await getTelegramFileUrl(record.telegram_file_id);

        const proxyImage = async (isDownload: boolean = false) => {
            if (isDownload) await incrementDownloads(id);

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

            return new NextResponse(blob, { status: response.status, headers });
        };

        if (serveRaw) {
            return proxyImage(hasExtension);
        }

        // Increment views only for HTML page view
        await incrementViews(id);

        const ext = record.metadata?.type?.startsWith('video/') ? '.mp4' : '.jpg';
        const proxiedImgSrc = `/i/${id}${ext}`;
        const views = record.views || 0;
        const downloads = record.downloads || 0;
        const formattedDate = new Date(record.created_at).toLocaleDateString();
        const formattedSize = record.metadata?.size ? (record.metadata.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown';

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
                        gap: 10px; 
                        background: rgba(18, 18, 22, 0.75); 
                        backdrop-filter: blur(16px); 
                        -webkit-backdrop-filter: blur(16px);
                        padding: 8px 14px; 
                        border-radius: 100px; 
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                        z-index: 100;
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
                        padding: 8px 16px; 
                        border-radius: 50px; 
                        transition: all 0.2s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        border: none;
                        background: transparent;
                        cursor: pointer;
                        font-family: inherit;
                    }
                    a.btn-primary, button.btn-primary { 
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); 
                        color: white; 
                        box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
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
                        width: 34px;
                        height: 34px;
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
                    
                    @media (max-width: 640px) {
                        .info-bar { font-size: 11px; gap: 12px; padding: 8px 16px; }
                        .toolbar { padding: 6px 10px; gap: 6px; }
                        a.btn, button { font-size: 12px; padding: 6px 12px; }
                    }
                </style>
            </head>
            <body>
                <div class="toast" id="toast">Copied to clipboard!</div>

                <div class="toolbar">
                    <a href="/" class="btn btn-secondary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        Upload
                    </a>
                    <button class="btn btn-secondary" id="copyBtn" onclick="copyLink()">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy Link
                    </button>
                    <button class="icon-btn" id="fullscreenBtn" title="Toggle Fullscreen (F)" onclick="toggleFullscreen()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    </button>
                    <a href="${proxiedImgSrc}" download class="btn btn-primary">
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
