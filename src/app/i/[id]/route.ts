import { NextRequest, NextResponse } from 'next/server';
import { getImage, incrementViews, incrementDownloads } from '@/lib/db';
import { getTelegramFileUrl } from '@/lib/telegram';

export const runtime = 'nodejs';

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

        const fileUrl = await getTelegramFileUrl(record.telegram_file_id);

        const proxyImage = async (isDownload: boolean = false) => {
            // Only increment downloads for direct file access (with extension)
            if (isDownload) {
                await incrementDownloads(id);
            }
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const headers = new Headers();
            headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            return new NextResponse(blob, { headers });
        };

        const accept = req.headers.get('accept') || '';
        if (hasExtension || (!accept.includes('text/html') && !isTelegramBot)) {
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
                <style>
                    body { margin: 0; background: #050505; color: white; font-family: 'Inter', system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
                    .container { position: relative; max-width: 90vw; max-height: 80vh; display: flex; align-items: center; justify-content: center; }
                    img, video { max-width: 100%; max-height: 80vh; border-radius: 12px; box-shadow: 0 30px 60px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1); }
                    .toolbar { 
                        position: fixed; 
                        top: 20px; 
                        left: 50%; 
                        transform: translateX(-50%); 
                        display: flex; 
                        gap: 15px; 
                        background: rgba(20, 20, 20, 0.7); 
                        backdrop-filter: blur(10px); 
                        -webkit-backdrop-filter: blur(10px);
                        padding: 10px 20px; 
                        border-radius: 100px; 
                        border: 1px solid rgba(255,255,255,0.1);
                        z-index: 100;
                    }
                    .info-bar {
                        position: fixed;
                        bottom: 30px;
                        background: rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(10px);
                        padding: 12px 24px;
                        border-radius: 16px;
                        display: flex;
                        gap: 30px;
                        font-size: 13px;
                        color: #a1a1aa;
                        border: 1px solid rgba(255,255,255,0.05);
                    }
                    .info-item b { color: white; margin-right: 5px; }
                    a { 
                        color: #ffffff; 
                        text-decoration: none; 
                        font-size: 14px; 
                        font-weight: 500;
                        padding: 8px 16px; 
                        border-radius: 50px; 
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    a.primary { background: #8b5cf6; color: white; }
                    a.primary:hover { background: #7c3aed; }
                    a.secondary { background: rgba(255,255,255,0.1); color: #a1a1aa; }
                    a.secondary:hover { background: rgba(255,255,255,0.2); color: white; }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <a href="/" class="secondary">Upload New</a>
                    <a href="${proxiedImgSrc}" download class="primary">Download Raw</a>
                </div>
                <div class="container">
                    ${record.metadata?.type?.startsWith('video/')
                ? `<video src="${proxiedImgSrc}" autoplay loop muted playsinline controls></video>`
                : `<img src="${proxiedImgSrc}" alt="PixEdge Image">`
            }
                </div>
                <div class="info-bar">
                    <div class="info-item"><b>Views</b> ${views}</div>
                    <div class="info-item"><b>Downloads</b> ${downloads}</div>
                    <div class="info-item"><b>Size</b> ${formattedSize}</div>
                    <div class="info-item"><b>Date</b> ${formattedDate}</div>
                </div>
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
