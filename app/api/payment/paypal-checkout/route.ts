import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSession } from "@/lib/auth";

// PayPal API Base URL
const PAYPAL_API = process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Get PayPal Access Token
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

    if (!response.ok) {
        throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
    }

    return data.access_token;
}

// Plan pricing (match your PricingPlans component)
const PLAN_PRICES = {
    test: { usd: 1, name: "Developer Test" },
    pro: { usd: 6, name: "Pro Analyst" },
    design: { usd: 30, name: "Design Studio" },
};

export async function POST(req: NextRequest) {
    try {
        const user = await getSession();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { planId } = await req.json();

        if (!planId || !PLAN_PRICES[planId as keyof typeof PLAN_PRICES]) {
            return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
        }

        const plan = PLAN_PRICES[planId as keyof typeof PLAN_PRICES];
        const accessToken = await getPayPalAccessToken();

        // For test and one-time payments, create an order
        // For recurring plans, you might want to use PayPal subscriptions API
        const isSubscription = planId !== "test";

        if (isSubscription) {
            // Create PayPal Subscription
            // Note: You'll need to create subscription plans in PayPal dashboard first
            // and store the plan IDs in your environment variables
            return NextResponse.json(
                { error: "PayPal subscriptions not yet configured. Please set up subscription plans in PayPal dashboard." },
                { status: 501 }
            );
        }

        // Detect base URL from request
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host");
        const baseUrl = `${protocol}://${host}`;

        // Create a one-time payment order (for test plan or one-time purchases)
        const order = {
            intent: "CAPTURE",
            purchase_units: [
                {
                    amount: {
                        currency_code: "USD",
                        value: plan.usd.toString(),
                    },
                    description: `${plan.name} - UIXScore`,
                    custom_id: user.id, // Store user ID for webhook processing
                },
            ],
            application_context: {
                brand_name: "UIXScore",
                landing_page: "NO_PREFERENCE",
                user_action: "PAY_NOW",
                return_url: `${baseUrl}/dashboard?payment=success&plan=${planId}`,
                cancel_url: `${baseUrl}/dashboard?payment=cancelled`,
            },
        };

        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify(order),
        });

        const orderData = await response.json();

        if (!response.ok) {
            console.error("PayPal Order Creation Error:", orderData);
            return NextResponse.json(
                { error: "Failed to create PayPal order", details: orderData },
                { status: response.status }
            );
        }

        // Store order in database for tracking
        await sql`
            INSERT INTO payment_orders (user_id, order_id, plan_id, amount, currency, status, payment_provider)
            VALUES (${user.id}, ${orderData.id}, ${planId}, ${plan.usd}, 'USD', 'pending', 'paypal')
            ON CONFLICT (order_id) DO NOTHING
        `;

        // Get approval URL
        const approvalUrl = orderData.links.find((link: any) => link.rel === "approve")?.href;

        return NextResponse.json({
            orderId: orderData.id,
            approvalUrl,
        });

    } catch (error: any) {
        console.error("PayPal Checkout Error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
