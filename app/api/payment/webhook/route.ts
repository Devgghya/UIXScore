export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@vercel/postgres";

const FREE_MAX_TOKENS = 2000;
const LITE_MAX_TOKENS = 2500;
const PLUS_MAX_TOKENS = 3000;
const PRO_MAX_TOKENS = 4000;
const AGENCY_MAX_TOKENS = 8000;
const DESIGN_MAX_TOKENS = 8000;

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get("x-razorpay-signature");
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // If no secret is configured, we can't secure the webhook.
        // For security, checking this is critical.
        if (!secret) {
            console.error("RAZORPAY_WEBHOOK_SECRET is not set in environment variables.");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 400 });
        }

        // Verify Signature
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.error("Invalid Webhook Signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const event = JSON.parse(body);

        // Handle order.paid
        if (event.event === "order.paid") {
            const order = event.payload.order.entity;
            const { userId, plan } = order.notes;

            if (!userId || !plan) {
                console.error("Webhook: Missing userId or plan in order notes", order.id);
                return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
            }

            // Determine limits
            let targetTokenLimit = FREE_MAX_TOKENS;
            if (plan === "pro") targetTokenLimit = PRO_MAX_TOKENS;
            else if (plan === "design") targetTokenLimit = DESIGN_MAX_TOKENS;

            const current = new Date().toISOString().slice(0, 7);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 Days

            // Idempotent Update
            // Note: We don't reset audits_used on existing rows, just update plan/limits
            await sql`
                INSERT INTO user_usage (user_id, plan, audits_used, period_key, token_limit, plan_expires_at)
                VALUES (${userId}, ${plan}, 0, ${current}, ${targetTokenLimit}, ${expiresAt.toISOString()})
                ON CONFLICT (user_id) DO UPDATE SET
                    plan = EXCLUDED.plan,
                    token_limit = EXCLUDED.token_limit,
                    plan_expires_at = EXCLUDED.plan_expires_at,
                    updated_at = NOW()
            `;

            console.log(`Webhook: Successfully updated plan for user ${userId} to ${plan}`);
            return NextResponse.json({ success: true });
        }

        // Return 200 for other events to acknowledge receipt
        return NextResponse.json({ status: "ignored" });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
