
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSession } from "@/lib/auth";

// PayPal API Base URL
const PAYPAL_API = process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
    return data.access_token;
}

const FREE_MAX_TOKENS = 2000;
const PRO_MAX_TOKENS = 4000;

export async function POST(req: NextRequest) {
    try {
        const user = await getSession();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { orderID } = await req.json();

        if (!orderID) {
            return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
        }

        const accessToken = await getPayPalAccessToken();

        // CAPTURE THE ORDER
        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        const captureData = await response.json();

        if (!response.ok) {
            // Check if already captured (COMPLETED)
            if (captureData.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
                // Return success if already done, but still update DB just in case
                // return NextResponse.json({ success: true, status: "ALREADY_CAPTURED" });
            } else {
                console.error("PayPal Capture Error:", captureData);
                return NextResponse.json(
                    { error: "Payment Capture Failed", details: captureData },
                    { status: response.status }
                );
            }
        }

        // CHECK STATUS
        if (captureData.status === "COMPLETED" || captureData.status === "APPROVED") {
            // Payment Verified - Update User Plan
            // Default to "pro" as that's the only plan we support via PayPal currently
            const planId = "pro";
            const targetTokenLimit = PRO_MAX_TOKENS;

            const current = new Date().toISOString().slice(0, 7);
            const expiresAt = new Date();

            // Check custom_id or look up order in DB to find billing cycle if possible
            // For now assume monthly unless we stored it. 
            // Ideally we should lookup payment_orders table but for MVP direct update works.
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 Days default for One-Time

            await sql`
                INSERT INTO user_usage (user_id, plan, audits_used, period_key, token_limit, plan_expires_at, subscription_id)
                VALUES (${user.id}, ${planId}, 0, ${current}, ${targetTokenLimit}, ${expiresAt.toISOString()}, ${orderID})
                ON CONFLICT (user_id) DO UPDATE SET
                  plan = EXCLUDED.plan,
                  token_limit = EXCLUDED.token_limit,
                  plan_expires_at = EXCLUDED.plan_expires_at,
                  subscription_id = EXCLUDED.subscription_id,
                  updated_at = NOW()
            `;

            // Mark order as completed in payment_orders table if it exists
            await sql`
                UPDATE payment_orders SET status = 'completed', updated_at = NOW() 
                WHERE order_id = ${orderID}
            `;

            return NextResponse.json({ success: true, plan: planId });
        } else {
            return NextResponse.json({ error: "Payment not completed", status: captureData.status }, { status: 400 });
        }

    } catch (error: any) {
        console.error("PayPal Verify Error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
