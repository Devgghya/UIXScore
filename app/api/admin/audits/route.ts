import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const { rows } = await sql`
            SELECT id, ui_title, created_at, score, framework, image_url, analysis
            FROM audits
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT 50
        `;

        return NextResponse.json({ audits: rows });
    } catch (error) {
        console.error("Admin Audits API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
