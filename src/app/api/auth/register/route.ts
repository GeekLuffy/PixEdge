import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";
import { generateId, rateLimit } from "@/lib/db";

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL.trim(),
        token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
    })
    : null;

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'anonymous';
        const limit = await rateLimit(`ratelimit:register:${ip}`, 5, 900);
        if (!limit.success) {
            return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
        }

        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
        }

        if (typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }
        if (password.length > 128) {
            return NextResponse.json({ error: "Password must be 128 characters or less" }, { status: 400 });
        }

        if (!redis) {
            return NextResponse.json({ error: "Database not configured" }, { status: 503 });
        }

        const userEmailKey = `user:email:${normalizedEmail}`;
        const existingId = await redis.get(userEmailKey);

        if (existingId) {
            return NextResponse.json({ error: "User already exists with this email" }, { status: 409 });
        }

        const id = generateId(); // Use our existing ID generator or uuid
        const hashedPassword = await bcrypt.hash(password, 10);

        const now = new Date();

        const user = {
            id,
            name: name ? String(name).trim() : normalizedEmail.split('@')[0],
            email: normalizedEmail,
            passwordHash: hashedPassword,
            emailVerified: null,
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || normalizedEmail)}&background=random`,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        // Transaction to create user
        const pipeline = redis.pipeline();
        pipeline.set(userEmailKey, id);
        pipeline.set(`user:${id}`, user);
        await pipeline.exec();

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Register Error:", error);
        return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
    }
}
