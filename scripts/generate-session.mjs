#!/usr/bin/env node
/**
 * PixEdge — Telegram MTProto Session Generator
 * ─────────────────────────────────────────────
 * Run this ONCE on your local machine to authenticate and get a
 * TELEGRAM_SESSION_STRING that you paste into your server's env vars.
 *
 * Usage:
 *   npm run generate:session
 *
 * Prerequisites:
 *   1. Visit https://my.telegram.org/apps and create an app.
 *   2. Copy the API ID (number) and API Hash (string).
 *   3. Have your Telegram phone number ready.
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const rl = createInterface({ input, output });

const line = '─'.repeat(55);

console.log('\n' + line);
console.log('  ⚡ PixEdge — Telegram MTProto Session Generator');
console.log(line);
console.log('  Get credentials from: https://my.telegram.org/apps\n');

const apiIdStr = (await rl.question('  API ID (number):  ')).trim();
const apiHash  = (await rl.question('  API Hash (string): ')).trim();

const apiId = parseInt(apiIdStr);
if (isNaN(apiId) || apiId <= 0) {
    console.error('\n  ❌ Invalid API ID — must be a positive integer.\n');
    process.exit(1);
}

console.log('\n  Connecting to Telegram...\n');

const client = new TelegramClient(
    new StringSession(''),
    apiId,
    apiHash,
    { connectionRetries: 5 }
);

await client.start({
    phoneNumber: async () => {
        const phone = (await rl.question('  Phone number (e.g. +14155552671): ')).trim();
        return phone;
    },
    password: async () => {
        const pw = (await rl.question('  2FA password (Enter to skip):     ')).trim();
        return pw;
    },
    phoneCode: async () => {
        const code = (await rl.question('  Telegram OTP code:                ')).trim();
        return code;
    },
    onError: (err) => {
        console.error('\n  ❌ Auth error:', err.message);
    },
});

const sessionString = client.session.save();

console.log('\n' + line);
console.log('  ✅ Authentication successful!\n');
console.log('  Add this to your .env.local (or Northflank env vars):\n');
console.log(`  TELEGRAM_SESSION_STRING=${sessionString}`);
console.log('\n' + line);
console.log('  ⚠️  Keep this secret — it grants full access to your Telegram account!');
console.log('  ⚠️  Never commit it to git.\n');

await client.disconnect();
rl.close();
process.exit(0);
