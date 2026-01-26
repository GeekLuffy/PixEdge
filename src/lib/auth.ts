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
                id: { label: "ID", type: "text" },
                first_name: { label: "First Name", type: "text" },
                username: { label: "Username", type: "text" },
                photo_url: { label: "Photo URL", type: "text" },
                auth_date: { label: "Auth Date", type: "text" },
                hash: { label: "Hash", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.hash || !process.env.TELEGRAM_BOT_TOKEN) {
                    console.log('Missing hash or token');
                    return null;
                }

                const { hash, ...data } = credentials;

                // Only these fields are sent by Telegram (exclude NextAuth internal fields)
                const telegramFields = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'];
                const dataCheckArr = telegramFields
                    .filter(key => data[key as keyof typeof data] && data[key as keyof typeof data]!.trim() !== '')
                    .sort()
                    .map(key => `${key}=${data[key as keyof typeof data]}`);
                const dataCheckString = dataCheckArr.join('\n');

                console.log('Data check string:', dataCheckString);

                // Use Node.js crypto module
                const crypto = require('crypto');
                const secret = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();
                const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

                console.log('Calculated HMAC:', hmac);
                console.log('Received hash:', hash);

                if (hmac !== hash) {
                    console.log('Hash mismatch!');
                    return null;
                }

                // Check expiry (24 hours)
                const now = Math.floor(Date.now() / 1000);
                if (now - parseInt(credentials.auth_date) > 86400) {
                    console.log('Auth expired');
                    return null;
                }

                return {
                    id: credentials.id.toString(),
                    name: credentials.first_name,
                    image: credentials.photo_url || null,
                    email: `${credentials.id}@telegram.user`,
                };
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                // @ts-ignore
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user, account }) {
            if (account && user) {
                token.sub = user.id;
            }
            return token;
        }
    }
};
