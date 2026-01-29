import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

const FREE_MAX_TOKENS = 2000;
const LITE_MAX_TOKENS = 2500;
const PLUS_MAX_TOKENS = 3000;
const PRO_MAX_TOKENS = 4000;
const AGENCY_MAX_TOKENS = 8000;
const DESIGN_MAX_TOKENS = 8000;

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const userId = session?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = await req.json();

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Payment Verified - Update User Plan
            let targetTokenLimit = FREE_MAX_TOKENS;
            if (planId === "pro") targetTokenLimit = PRO_MAX_TOKENS;
            else if (planId === "design") targetTokenLimit = DESIGN_MAX_TOKENS;

            const current = new Date().toISOString().slice(0, 7);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // Default to 30 days

            await sql`
        INSERT INTO user_usage (user_id, plan, audits_used, period_key, token_limit, plan_expires_at)
        VALUES (${userId}, ${planId}, 0, ${current}, ${targetTokenLimit}, ${expiresAt.toISOString()})
        ON CONFLICT (user_id) DO UPDATE SET
          plan = EXCLUDED.plan,
          token_limit = EXCLUDED.token_limit,
          plan_expires_at = EXCLUDED.plan_expires_at,
          updated_at = NOW()
      `;

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }
    } catch (error) {
        console.error("Razorpay Verify Error:", error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
