import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createToken, setSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();

        const { rows } = await sql`
            SELECT id, email, password_hash, first_name, last_name, is_verified 
            FROM users 
            WHERE email = ${normalizedEmail}
        `;

        if (rows.length === 0) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        if (user.is_verified === false) {
            return NextResponse.json({
                error: "Email not verified",
                requireVerification: true,
                email: user.email
            }, { status: 403 });
        }

        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@uixscore.com").split(",");
        const isAdmin = ADMIN_EMAILS.includes(user.email);

        const token = await createToken({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isAdmin
        });

        await setSession(token);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                isAdmin
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
