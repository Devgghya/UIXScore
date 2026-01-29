import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";



const PLAN_PRICES_USD = {
    pro: 600,     // $6.00
    design: 3000, // $30.00
};

const PLAN_PRICES_INR = {
    pro: 49900,    // ₹499.00
    design: 249900, // ₹2,499.00
};

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const userId = session?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { planId, currency = "USD" } = await req.json();

        if (!planId) {
            return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
        }

        const prices = currency === "INR" ? PLAN_PRICES_INR : PLAN_PRICES_USD;
        const amount = prices[planId as keyof typeof prices];

        if (!amount) {
            return NextResponse.json({ error: "Invalid plan or currency" }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // Receipt max length is 40. Clerk IDs are long. Shorten the receipt.
        const shortReceipt = `rcpt_${Date.now().toString().slice(-10)}`;

        const options = {
            amount: amount,
            currency: currency,
            receipt: shortReceipt,
            notes: {
                userId: userId,
                plan: planId,
            },
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error: any) {
        console.error("Razorpay Create Order Error:", error);
        return NextResponse.json({
            error: "Failed to create order",
            details: error.message,
            debug: {
                hasKeyId: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                hasSecret: !!process.env.RAZORPAY_KEY_SECRET
            }
        }, { status: 500 });
    }
}
