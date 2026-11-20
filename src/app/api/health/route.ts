import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { ensureTelegramWebhook } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorizedForceCheck(req: NextRequest): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) return false;

  const provided =
    req.headers.get('x-telegram-bot-api-secret-token')?.trim() ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    '';

  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expectedSecret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const force =
    req.nextUrl.searchParams.get('fix') === '1' && isAuthorizedForceCheck(req);

  const webhook = await ensureTelegramWebhook({
    force,
    source: force ? 'health_force' : 'health',
  });

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    webhook: {
      ok: webhook.ok,
      action: webhook.action,
      configured: Boolean(webhook.expectedUrl),
      pendingUpdates: webhook.pendingUpdates ?? 0,
      ...(webhook.reason ? { reason: webhook.reason } : {}),
    },
  });
}
