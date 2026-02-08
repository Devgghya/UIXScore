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

        // ONE-TIME PAYMENT for International (USD/Others)
        // Subscription is not supported for international cards effectively without huge friction
        // So we treat it as a one-time purchase for the duration

        let amount = 0;
        // Pricing Logic (Must match frontend visually)
        if (planId === "pro") {
            if (billingCycle === "annual") {
                amount = 9500; // $95.00 (Example: 20% off $120 -> $96 ~ $95)
                // Or stick to exact visual math: $1 * 12 * 0.8 = $9.6 -> let's say $10 for simplicity or existing logic
                // Looking at PricingPlans.tsx: 
                // Pro Annual: $0.8 * 12 = $9.6 ($10)
                // Pro Monthly: $1

                // Let's reuse the logic from frontend implicitly or define it here clearly
                // Frontend says: $1/mo. Annual is 20% off.
                // $1 * 12 = $12. 20% off = $9.60.
                amount = 960; // in cents
            } else {
                amount = 100; // $1.00 in cents
            }
        }

        if (amount === 0) {
            return NextResponse.json({ error: "Invalid plan configuration" }, { status: 400 });
        }

        const options = {
            amount: amount,
            currency: currency,
            receipt: `rcpt_${Date.now()}_${userId.substring(0, 5)}`,
            payment_capture: 1, // Auto capture
            notes: {
                userId: userId,
                plan: planId,
                billingCycle: billingCycle,
                type: "one-time-order"
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            id: order.id,
            type: "order",
            amount: order.amount,
            currency: order.currency,
        });

    } catch (error: any) {
        console.error("Razorpay Create Error:", error);
        return NextResponse.json({
            error: "Failed to initialize payment",
            details: error.message
        }, { status: 500 });
    }
}
