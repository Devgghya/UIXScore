import { currentUser } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "devkulshrestha27@gmail.com").split(",");
const PLAN_TOKENS = {
    free: 2000,
    lite: 2500,
    plus: 3000,
    pro: 4000,
    agency: 8000,
};

export async function POST(req: Request) {
    try {
        const user = await currentUser();

        if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0].emailAddress)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { userId, action, plan } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
        }

        if (action === "update-plan") {
            const tokenLimit = PLAN_TOKENS[plan as keyof typeof PLAN_TOKENS] || 2000;
            const periodKey = new Date().toISOString().slice(0, 7);
            await sql`
                INSERT INTO user_usage (user_id, plan, token_limit, period_key, updated_at)
                VALUES (${userId}, ${plan}, ${tokenLimit}, ${periodKey}, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    plan = EXCLUDED.plan, 
                    token_limit = EXCLUDED.token_limit, 
                    updated_at = NOW()
            `;
            return NextResponse.json({ success: true, plan });
        }

        if (action === "downgrade") {
            // Reset to Free Plan
            await sql`
                UPDATE user_usage
                SET plan = 'free', token_limit = ${PLAN_TOKENS.free}, updated_at = NOW()
                WHERE user_id = ${userId}
            `;
            return NextResponse.json({ success: true, plan: "free" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Admin Manage User Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
