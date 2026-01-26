import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";
import { generateId } from "@/lib/db";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const userEmailKey = `user:email:${email}`;
        const existingId = await redis.get(userEmailKey);

        if (existingId) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const id = generateId(); // Use our existing ID generator or uuid
        const hashedPassword = await bcrypt.hash(password, 10);

        const now = new Date();

        const user = {
            id,
            name: name || email.split('@')[0],
            email,
            passwordHash: hashedPassword,
            emailVerified: null,
            image: `https://ui-avatars.com/api/?name=${name || email}&background=random`,
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
