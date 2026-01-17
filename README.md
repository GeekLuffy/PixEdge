# ⚡ SnapEdge: Ultra-Fast Edge Image Hosting

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Upstash](https://img.shields.io/badge/Upstash-00E699?style=for-the-badge&logo=upstash&logoColor=black)](https://upstash.com/)
[![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://telegram.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**SnapEdge** is a professional-grade, open-source image hosting platform designed for speed and infinite scalability. It leverages the Telegram Bot API as a decentralized storage backend and Upstash Redis for high-performance metadata management, delivering images directly through edge redirection.

---

## 🚀 Key Features

*   **📦 Messaging-Backbone Storage**: Unlimited, free, and decentralized storage powered by Telegram infrastructure.
*   **🏎️ Edge Content Delivery**: Uses high-speed redirection (302) to minimize server bandwidth and maximize delivery speed.
*   **🛠️ Developer-First API**: Fully versioned REST API (`/api/v1`) for programmatic uploads and metadata retrieval.
*   **💎 Premium UX/UI**: A stunning, glassmorphic dark-mode interface built with Framer Motion and Outfit typography.
*   **🔗 Custom Vanity URLs**: Support for custom file names and human-readable slugs.
*   **📊 Real-time Analytics**: Built-in view counters and metadata tracking (size, format, timestamp).
*   **📱 QR Integration**: Instant QR code generation for every uploaded asset.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Database**: [Upstash Redis](https://upstash.com/)
- **Storage**: [Telegram Bot API](https://core.telegram.org/bots/api)
- **Styling**: [Vanilla CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) + [Framer Motion](https://www.framer.com/motion/)
- **API**: Versioned REST JSON API

---

## 🤝 Open Source & Contributions

SnapEdge is **Open Source** and built for the community! We are actively looking for collaborators and contributors to make this the ultimate image hosting solution.

### How to Collaborate:
1.  **Fork** the repository and experiment with new features.
2.  **Open an Issue** if you find bugs or have feature requests.
3.  **Submit Pull Requests** for UI improvements, API enhancements, or documentation.
4.  **Join the Discussion**: Help us shape the future of edge-based messaging storage.

---

## ⚙️ Getting Started

### 1. Prerequisites
- A **Telegram Bot Token** (From [@BotFather](https://t.me/botfather))
- A **Telegram Chat ID** (Use [@userinfobot](https://t.me/userinfobot))
- An **Upstash Redis** account (Free tier is perfect)

### 2. Environment Variables
Create a `.env.local` file:
```env
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_id
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
NEXT_PUBLIC_BASE_URL=https://your-deployment.com
```

---

## 📖 Project Structure & Architecture

```mermaid
graph LR
    User --> API[Next.js API]
    API --> Redis[Upstash Redis]
    API --> Telegram[Telegram CDN]
    Redis -- "Metadata" --> API
    Telegram -- "File ID" --> API
```

---

## 🏷️ Keywords & Tags
`telegram-storage` `image-hosting` `cdn` `edge-computing` `telegraph` `upstash` `nextjs` `redis-database` `open-source` `serverless` `fast-upload` `decentralized-storage` `developer-api`

---

## 📜 License
Distributed under the **MIT License**. Feel free to use, modify, and distribute as you wish!
