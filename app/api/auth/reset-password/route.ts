import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
        }

        // Validate token
        const { rows } = await sql`
            SELECT email FROM password_resets 
            WHERE token = ${token} 
            AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        `;

        if (rows.length === 0) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        const email = rows[0].email;

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 10);

        // Update user
        await sql`
            UPDATE users 
            SET password_hash = ${passwordHash} 
            WHERE email = ${email}
        `;

        // Delete used token (and any old ones for this email)
        await sql`DELETE FROM password_resets WHERE email = ${email}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
