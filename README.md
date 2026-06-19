# ⚡ PixEdge: Ultra-Fast Edge Media Hosting

[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)](https://github.com/geekluffy/pixedge/releases)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Upstash](https://img.shields.io/badge/Upstash-00E699?style=for-the-badge&logo=upstash&logoColor=black)](https://upstash.com/)
[![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://telegram.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**PixEdge** is a professional-grade, open-source media hosting platform built for speed and infinite scalability. It uses Telegram as a free, unlimited storage backend and Upstash Redis for metadata — delivering files via edge redirection with zero storage costs.

> **v2.0.0** introduces full **MTProto support via gramjs**, enabling uploads up to **2 GB** (vs. the 20 MB Bot API limit), true streaming delivery with flat RAM usage, and an automatic fallback to the Bot API when MTProto is not configured.

---

## 🚀 Features

| Feature | Details |
| :--- | :--- |
| 📦 **Unlimited Storage** | Powered by Telegram infrastructure — no storage limits, ever |
| 🚀 **2 GB Uploads** | MTProto (gramjs) mode breaks the 20 MB Bot API cap — upload up to 2 GB |
| 🏎️ **Edge Delivery** | 302 redirect to Telegram CDN — minimal server bandwidth |
| 🌊 **True Streaming** | v2 files are streamed in 1 MB chunks with flat RAM usage |
| 👤 **User Accounts** | Email/password, GitHub OAuth, Google OAuth, and Telegram Login |
| 🗂️ **Personal Dashboard** | Manage your uploads, view analytics, generate API keys |
| 🔑 **API Keys** | Generate a personal API key from your dashboard for programmatic access |
| 🔗 **Vanity URLs** | Custom human-readable slugs with collision detection and suggestions |
| ⏳ **Expiry Links** | Set links to auto-expire after 1h, 24h, 7d, or 30d (Redis TTL) |
| 📊 **Analytics** | Per-file view and download counters; platform-wide public stats page |
| 📱 **QR Codes** | Instant QR code for every upload |
| 🤖 **Telegram Bot** | Upload via `@PixEdge_Bot` and link your Telegram account to your web account |
| 📋 **Clipboard Paste** | Paste images directly from your clipboard on the upload page |
| 🖥️ **ShareX Support** | Download a ready-to-use `.sxcu` config from your dashboard |
| 🌙 **Dark / Light Mode** | Theme toggle with persistence |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Auth**: [NextAuth.js](https://next-auth.js.org/) — GitHub, Google, Credentials, Telegram
- **Database**: [Upstash Redis](https://upstash.com/)
- **Storage (v1)**: [Telegram Bot API](https://core.telegram.org/bots/api) — up to 20 MB, zero config
- **Storage (v2)**: [MTProto via gramjs](https://gram.js.org/) — up to 2 GB, streaming
- **Styling**: Vanilla CSS + [Framer Motion](https://www.framer.com/motion/)
- **API**: Versioned REST JSON API (`/api/v1`)

---

## 🔌 Developer API (v1)

All authenticated endpoints accept either a session cookie **or** an `X-API-Key` header (generate your key at `/dashboard`).

### Authentication
```bash
# Via header
curl -H "X-API-Key: pe_your_key_here" ...

# Or via Bearer token
curl -H "Authorization: Bearer pe_your_key_here" ...
```

### Endpoints

#### Upload Media
**`POST /api/v1/upload`** · `multipart/form-data`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | File | Yes | Image or video (max 20 MB without MTProto, up to 2 GB with MTProto) |
| `customId` | String | No | Custom vanity slug |
| `expiresIn` | Number | No | Seconds until expiry: `3600`, `86400`, `604800`, `2592000` |

```bash
curl -X POST https://your-domain.com/api/v1/upload \
  -H "X-API-Key: pe_your_key" \
  -F "file=@video.mp4" \
  -F "customId=my-video" \
  -F "expiresIn=86400"
```

**Rate limits:** 100 uploads/min for authenticated users · 20/min for anonymous.

#### Get File Metadata
**`GET /api/v1/info/[id]`**

#### List Your Uploads
**`GET /api/v1/list`** · Requires auth

Returns your last 50 uploads with URLs, view/download counts, and expiry timestamps.

#### Delete a File
**`DELETE /api/v1/delete/[id]`** · Requires auth · Ownership enforced

```bash
curl -X DELETE https://your-domain.com/api/v1/delete/my-video \
  -H "X-API-Key: pe_your_key"
```

#### Platform Stats
**`GET /api/stats`** · Public

---

## 🖥️ ShareX Integration

1. Go to your **Dashboard → API Keys** and generate a key.
2. Visit `https://your-domain.com/api/sharex?key=pe_your_key` — this downloads `PixEdge.sxcu`.
3. Open ShareX → **Destinations → Custom Uploaders → Import** → select the file.
4. Set PixEdge as your active image uploader. Done.

---

## 🤖 Telegram Bot Integration

PixEdge includes `@PixEdge_Bot` for direct uploads from Telegram.

### Webhook Setup
After deployment, register the webhook once:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-domain.com/api/webhook/telegram
```

### Commands
- `/start` — Welcome message
- `/upload` or `/tgm` — Upload an image
- `/help` — Usage instructions
- `/link` — Link your Telegram account to your PixEdge web account

### Account Linking
Send `/link` to the bot — it returns a one-time URL. Visit it while logged into your PixEdge account to merge the two identities. After linking, bot uploads are tracked under your account.

---

## ⚙️ Getting Started

### Prerequisites
- A **Telegram Bot Token** (from [@BotFather](https://t.me/botfather))
- A **Telegram Chat ID** (your storage channel — use [@userinfobot](https://t.me/userinfobot))
- An **Upstash Redis** database ([free tier](https://upstash.com/))
- **Node.js 18+**
- (Optional) GitHub / Google OAuth app credentials for social login
- (Optional) Telegram MTProto credentials for 2 GB upload support

### Local Development
```bash
git clone https://github.com/GeekLuffy/PixEdge.git
cd PixEdge
npm install
# copy .env.example → .env.local and fill in values
npm run dev
```

### Environment Variables

**.env.local (minimum required)**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_storage_channel_id
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=your_token
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXTAUTH_SECRET=a_random_32_char_secret
NEXTAUTH_URL=https://your-domain.com
```

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgeekluffy%2FPixEdge&env=TELEGRAM_BOT_TOKEN,TELEGRAM_CHAT_ID,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN,NEXT_PUBLIC_BASE_URL,NEXTAUTH_SECRET,NEXTAUTH_URL)

---

## 🆕 v2.0.0 — MTProto Mode (2 GB Uploads)

PixEdge v2 adds an optional **MTProto layer** powered by [gramjs](https://gram.js.org/). When configured, the upload route automatically uses MTProto instead of the Bot API, raising the file size limit from **20 MB → 2 GB**. Files uploaded via MTProto are streamed back to clients in 1 MB chunks with minimal RAM overhead.

### How it works

```
Upload route detects TELEGRAM_API_ID env var
        │
        ├── Present  →  gramjs MTProto  →  up to 2 GB
        └── Absent   →  Bot API         →  up to 20 MB
```

### Setup (3 steps)

**Step 1** — Get MTProto credentials:
1. Go to [https://my.telegram.org/apps](https://my.telegram.org/apps) → create an app.
2. Copy **App api_id** and **App api_hash**.

**Step 2** — Generate a session string:
```bash
npm run generate:session
# Enter your phone number and OTP when prompted.
# Copy the printed TELEGRAM_SESSION_STRING.
```

**Step 3** — Add to `.env.local`:
```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string
MAX_UPLOAD_SIZE_MB=2000   # optional, default is 2000 (2 GB)
```

> ⚠️ **Never commit `TELEGRAM_SESSION_STRING` to git.** Treat it like a password — it grants full access to your Telegram account.

---

## 📖 Architecture

```mermaid
graph LR
    User -->|Upload / Auth| Next[Next.js App Router]
    Next -->|Store metadata| Redis[Upstash Redis]
    Next -->|v1 - Bot API ≤20 MB| Telegram[Telegram CDN]
    Next -->|v2 - MTProto ≤2 GB| Telegram
    Next -->|302 redirect / stream| Telegram
    Redis -->|Metadata| Next
    Bot[Telegram Bot] -->|Webhook| Next
```

---

## 🤝 Contributing

PixEdge is open source and welcomes contributions!

1. **Fork** the repo and create a feature branch.
2. **Open an Issue** for bugs or feature requests.
3. **Submit a PR** — UI improvements, API enhancements, and docs are all welcome.
4. **Join the community**: [@EdgeBots](https://t.me/EdgeBots) (updates) · [@EdgeBotSupport](https://t.me/EdgeBotSupport) (support)

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

**Made with ❤️ by [Geekluffy](https://github.com/geekluffy)**
