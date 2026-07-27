import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        }
    }
}


// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const authOptions: NextAuthOptions = {
    // @ts-ignore
    adapter: UpstashRedisAdapter(redis),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/login',
    },
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || "",
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const userEmailKey = `user:email:${credentials.email}`;
                const userId = await redis.get(userEmailKey);

                if (!userId) return null;

                const user: any = await redis.get(`user:${userId}`);
                if (!user || !user.passwordHash) return null;

                const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

                if (isValid) {
                    return {
                        id: user.id || userId as string,
                        name: user.name,
                        email: user.email,
                        image: user.image
                    };
                }
                return null;
            }
        }),
        CredentialsProvider({
            id: "telegram-login",
            name: "Telegram",
            credentials: {
                telegram_id: { label: "Telegram ID", type: "text" },
                id: { label: "ID", type: "text" },
                first_name: { label: "First Name", type: "text" },
                last_name: { label: "Last Name", type: "text" },
                username: { label: "Username", type: "text" },
                photo_url: { label: "Photo URL", type: "text" },
                auth_date: { label: "Auth Date", type: "text" },
                hash: { label: "Hash", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.hash || !process.env.TELEGRAM_BOT_TOKEN) {
                    console.log('Telegram login failed: Missing hash or TELEGRAM_BOT_TOKEN');
                    return null;
                }

                // Numeric Telegram User ID (ignore provider ID "telegram-login")
                let rawId = credentials.telegram_id;
                if (!rawId || rawId === 'telegram-login') {
                    rawId = credentials.id;
                }
                if (!rawId || rawId === 'telegram-login') {
                    console.log('Telegram login failed: Invalid telegram ID');
                    return null;
                }

                const tgUser: Record<string, string> = {};
                tgUser['id'] = rawId;
                if (credentials.first_name && credentials.first_name !== 'undefined') tgUser['first_name'] = credentials.first_name;
                if (credentials.last_name && credentials.last_name !== 'undefined') tgUser['last_name'] = credentials.last_name;
                if (credentials.username && credentials.username !== 'undefined') tgUser['username'] = credentials.username;
                if (credentials.photo_url && credentials.photo_url !== 'undefined') tgUser['photo_url'] = credentials.photo_url;
                if (credentials.auth_date && credentials.auth_date !== 'undefined') tgUser['auth_date'] = credentials.auth_date;

                const dataCheckArr = Object.keys(tgUser)
                    .sort()
                    .map(key => `${key}=${tgUser[key]}`);
                const dataCheckString = dataCheckArr.join('\n');

                const crypto = require('crypto');
                const secret = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();
                const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

                if (hmac !== credentials.hash) {
                    console.log('Telegram login failed: Hash mismatch', { calculated: hmac, received: credentials.hash, dataCheckString });
                    return null;
                }

                // Check expiry (24 hours)
                const now = Math.floor(Date.now() / 1000);
                if (credentials.auth_date && now - parseInt(credentials.auth_date) > 86400) {
                    console.log('Telegram login failed: Auth expired');
                    return null;
                }

                return {
                    id: rawId,
                    name: credentials.first_name || credentials.username || 'Telegram User',
                    image: credentials.photo_url || null,
                    email: `${rawId}@telegram.user`,
                };
            }
        }),
        CredentialsProvider({
            id: "telegram-pin",
            name: "Telegram PIN",
            credentials: {
                pin: { label: "PIN", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.pin) return null;

                const cleanPin = credentials.pin.trim();
                const pinKey = `telegram:login_pin:${cleanPin}`;
                const data: any = await redis.get(pinKey);

                if (!data) return null;

                // Delete PIN after single-use authentication
                await redis.del(pinKey);

                const userData = typeof data === 'string' ? JSON.parse(data) : data;

                return {
                    id: userData.id.toString(),
                    name: userData.first_name || userData.name || 'Telegram User',
                    image: userData.photo_url || null,
                    email: `${userData.id}@telegram.user`,
                };
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                // @ts-ignore
                session.user.id = token.sub;
                
                // Fetch custom avatar or saved Telegram image if available in Redis
                try {
                    const customAvatar: string | null = await redis.get(`user:custom_avatar:${token.sub}`);
                    if (customAvatar) {
                        session.user.image = customAvatar;
                    } else if (token.picture) {
                        session.user.image = token.picture;
                    }
                } catch (e) {
                    // Fallback to token picture
                }
            }
            return session;
        },
        async jwt({ token, user, account }) {
            if (account && user) {
                token.sub = user.id;
                if (user.image) {
                    token.picture = user.image;
                }
            }
            return token;
        }
    }
};
