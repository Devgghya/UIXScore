import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const RAZORPAY_PLAN_MAPPING: Record<string, Record<string, string>> = {
    pro: {
        monthly: "plan_SC1HyWpQZ1FTkv",  // Pro plan at ₹99/month
        annual: "plan_SC1JGsFlk9VZIF",   // Pro plan at ₹950/year
    },
};

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const userId = session?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { planId, billingCycle = "monthly", currency = "USD" } = await req.json();

        if (!planId) {
            return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // Use Subscriptions for INR to enable Autopay/Recurring
        if (currency === "INR" && RAZORPAY_PLAN_MAPPING[planId]) {
            const rzpPlanId = RAZORPAY_PLAN_MAPPING[planId][billingCycle];

            if (!rzpPlanId) {
                return NextResponse.json({ error: "Invalid plan or billing cycle" }, { status: 400 });
            }

            const subscriptionOptions: any = {
                plan_id: rzpPlanId,
                total_count: billingCycle === "annual" ? 10 : 120, // Duration (Recurrence count)
                quantity: 1,
                customer_notify: 1,
                notes: {
                    userId: userId,
                    plan: planId,
                    billingCycle: billingCycle,
                },
            };

            const subscription: any = await razorpay.subscriptions.create(subscriptionOptions);

            return NextResponse.json({
                id: subscription.id,
                type: "subscription",
                amount: 0,
                currency: "INR",
            });
        }

        // FALLBACK: One-time payment (Old Logic for non-subscription or Global)
        return NextResponse.json({ error: "Only INR recurring payments are supported via Razorpay at this time." }, { status: 400 });

    } catch (error: any) {
        console.error("Razorpay Create Error:", error);
        return NextResponse.json({
            error: "Failed to initialize payment",
            details: error.message
        }, { status: 500 });
    }
}
