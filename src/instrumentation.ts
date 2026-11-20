export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // Wait briefly after server boot so HTTP routes are ready to accept Telegram webhook deliveries
  const timer = setTimeout(async () => {
    try {
      const { ensureTelegramWebhook } = await import('@/lib/telegram');
      const result = await ensureTelegramWebhook({ force: true, source: 'startup' });
      if (result.action === 'updated') {
        console.log(`[startup] Telegram webhook auto-configured -> ${result.expectedUrl}`);
      } else if (result.action === 'error') {
        console.warn(`[startup] Telegram webhook verification error: ${result.reason}`);
      } else if (result.action === 'skipped') {
        console.warn(`[startup] Telegram webhook check skipped: ${result.reason}`);
      }
    } catch (err) {
      console.error('[startup] Failed to run Telegram webhook check:', err);
    }
  }, 3000);

  (timer as unknown as { unref?: () => void })?.unref?.();
}
