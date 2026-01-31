"use client";

import { Check, Sparkles, CreditCard, Shield, Zap, Rocket, Loader2, Coffee, Lock, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface Plan {
    id: string;
    name: string;
    price: string;
    priceInr: string;
    period: string;
    features: string[];
    recommended?: boolean;
    cta: string;
    color: string;
}

const PLANS: Plan[] = [
    {
        id: "pro",
        name: "Pro Analyst",
        price: "$6",
        priceInr: "₹499",
        period: "/month",
        features: [
            "60 Audits per month",
            "All Frameworks (WCAG, Gestalt)",
            "Download Official PDF Reports",
            "Unlimited History",
        ],
        cta: "Upgrade to Pro",
        color: "blue",
    },
    {
        id: "design",
        name: "Design Studio",
        price: "$30",
        priceInr: "₹2499",
        period: "/month",
        features: [
            "Unlimited Audits",
            "Priority Faster Processing",
            "Everything in Pro",
            "Team Dashboard",
        ],
        recommended: true,
        cta: "Upgrade to Studio",
        color: "indigo",
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: "Contact",
        priceInr: "Contact",
        period: "",
        features: [
            "White-label Reports",
            "API Access",
            "Custom Integration",
            "Dedicated Support",
        ],
        cta: "Contact Sales",
        color: "purple",
    },
];

import { useAuth } from "@/components/auth-provider";
import { ContactModal } from "@/components/ContactModal";

export function PricingPlans({
    onUpgrade,
    planExpiresAt,
    currentPlan,
    subscriptionId,
    refreshUsage
}: {
    onUpgrade: (planId: string) => void,
    planExpiresAt: string | null,
    currentPlan: string,
    subscriptionId?: string | null,
    refreshUsage?: () => void
}) {
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [region, setRegion] = useState<"IN" | "GLOBAL">("GLOBAL");
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    const handleCancelSubscription = async () => {
        if (!window.confirm("Are you sure you want to cancel your subscription? You'll still have access until the current period ends.")) return;

        setCancelling(true);
        try {
            const res = await fetch("/api/payment/cancel-subscription", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                alert("Subscription cancelled successfully.");
                if (refreshUsage) refreshUsage();
            } else {
                alert(data.error || "Failed to cancel subscription.");
            }
        } catch (err) {
            alert("An error occurred while cancelling.");
        } finally {
            setCancelling(false);
        }
    };

    useEffect(() => {
        // 1. Instant Timezone Check (Fallback/Fastest)
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz === 'Asia/Kolkata') {
            setRegion("IN");
        }

        // 2. IP Detection (More Accurate)
        fetch("https://ipapi.co/json/")
            .then(res => res.json())
            .then(data => {
                if (data.country_code === "IN") {
                    setRegion("IN");
                } else {
                    // Only override if we are sure it's NOT IN (e.g. traveling?) 
                    // But for now, let's trust the IP if it returns.
                    // If IP says US but Timezone says IN, usually IP is right (VPN).
                    // If IP fails, we keep Timezone result.
                    if (data.country_code) setRegion(data.country_code === "IN" ? "IN" : "GLOBAL");
                }
            })
            .catch(() => console.log("Region detection failed, using timezone fallback"));

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleSubscribe = async (planId: string) => {
        if (!user) {
            alert("Please sign in to upgrade your plan.");
            window.location.href = "/login?redirect=/dashboard?tab=pricing";
            return;
        }

        if (planId === "enterprise") {
            setIsContactModalOpen(true);
            return;
        }

        if (region === "GLOBAL") {
            // Placeholder for Lemon Squeezy / Global Payment
            alert("Global payments via Lemon Squeezy are coming soon!");
            return;
        }

        if (!window.Razorpay) {
            alert("Razorpay SDK failed to load. Please check your internet connection.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            alert("Razorpay Key ID is missing. Please restart the dev server to load environment variables.");
            return;
        }

        setLoadingPlan(planId);
        try {
            // 1. Create Order
            const res = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId, billingCycle, currency: region === "IN" ? "INR" : "USD" }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.details || data.error || "Failed to create order");
            }
            const paymentData = await res.json();

            // 2. Initialize Razorpay
            const options: any = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                name: "UIXScore",
                description: `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await fetch("/api/payment/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                ...response,
                                planId,
                                billingCycle,
                                type: paymentData.type === 'subscription' ? 'subscription' : 'order'
                            }),
                        });

                        if (verifyRes.ok) {
                            onUpgrade(planId); // Success! Refresh user state
                        } else {
                            alert("Payment verification failed. Please contact support.");
                        }
                    } catch (err) {
                        alert("Payment verification failed.");
                    } finally {
                        setLoadingPlan(null);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setLoadingPlan(null);
                    }
                },
                prefill: {
                    name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                    email: user?.email || "",
                },
                theme: {
                    color: "#6366f1",
                },
            };

            if (paymentData.type === 'subscription') {
                options.subscription_id = paymentData.id;
            } else {
                options.order_id = paymentData.id;
                options.amount = paymentData.amount;
                options.currency = paymentData.currency;
            }

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

            rzp1.on('payment.failed', function (response: any) {
                alert(response.error.description);
                setLoadingPlan(null);
            });

        } catch (error: any) {
            console.error(error);
            alert(`Checkout failed: ${error.message}`);
            setLoadingPlan(null);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 md:px-0">
            <div className="text-center mb-8 md:mb-12">
                <h2 className="text-2xl md:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tight">
                    Simple, Transparent Pricing
                </h2>
                <p className="text-muted-text text-sm md:text-lg max-w-2xl mx-auto px-4">
                    Choose the perfect plan for your design auditing needs. No hidden fees.
                    {planExpiresAt && (
                        <span className="block mt-4 text-xs md:text-sm font-bold text-accent-primary bg-accent-primary/5 border border-accent-primary/20 py-2 px-4 rounded-full w-fit mx-auto">
                            📅 Your plan renews on {new Date(planExpiresAt).toLocaleDateString()}
                        </span>
                    )}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6 mt-6 md:mt-8">
                    {/* Billing Toggle */}
                    <div className="flex items-center gap-1 md:gap-2 p-1 bg-card border border-border-dim rounded-xl w-full sm:w-auto">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-accent-primary text-white shadow-md" : "text-muted-text hover:text-foreground"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle("annual")}
                            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${billingCycle === "annual" ? "bg-accent-primary text-white shadow-md" : "text-muted-text hover:text-foreground"}`}
                        >
                            Annual <span className="text-[9px] md:text-[10px] bg-white/20 px-1 rounded ml-1">SAVE 20%</span>
                        </button>
                    </div>

                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                {PLANS.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative bg-card border rounded-xl md:rounded-2xl p-5 md:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${plan.recommended
                            ? "border-accent-primary shadow-[0_0_40px_rgba(99,102,241,0.1)] md:scale-105 z-10"
                            : "border-border-dim shadow-xl"
                            }`}
                    >
                        {plan.recommended && (
                            <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 md:px-4 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg">
                                Most Popular
                            </div>
                        )}

                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 md:mb-6 self-start ${plan.color === "indigo" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                            plan.color === "purple" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                                plan.color === "blue" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                                    "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            }`}>
                            {plan.id === "pro" ? <Sparkles className="w-5 h-5 md:w-6 md:h-6" /> :
                                plan.id === "agency" ? <Shield className="w-5 h-5 md:w-6 md:h-6" /> :
                                    plan.id === "plus" ? <Rocket className="w-5 h-5 md:w-6 md:h-6" /> :
                                        <Zap className="w-5 h-5 md:w-6 md:h-6" />}
                        </div>

                        <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-4 md:mb-6">
                            <span className="text-4xl font-black text-foreground">
                                {plan.id === "enterprise" ? "Contact" : region === "IN" ? (
                                    billingCycle === "annual" && plan.id !== "free"
                                        ? `₹${(parseInt(plan.priceInr.replace("₹", "")) * 0.8).toFixed(0)}`
                                        : plan.priceInr
                                ) : (
                                    billingCycle === "annual" && plan.id !== "free"
                                        ? `$${(parseInt(plan.price.replace("$", "")) * 0.8).toFixed(0)}`
                                        : plan.price
                                )}
                            </span>
                            {plan.period && (
                                <div className="flex flex-col">
                                    <span className="text-muted-text font-medium text-sm leading-none">
                                        {billingCycle === "annual" ? "/mo" : "/month"}
                                    </span>
                                    {billingCycle === "annual" && plan.id !== "free" && plan.id !== "enterprise" && (
                                        <span className="text-[10px] text-accent-primary font-bold mt-1 uppercase tracking-tighter">
                                            Billed {region === "IN" ? "₹" : "$"}{
                                                region === "IN"
                                                    ? (parseInt(plan.priceInr.replace("₹", "")) * 12 * 0.8).toFixed(0)
                                                    : (parseInt(plan.price.replace("$", "")) * 12 * 0.8).toFixed(0)
                                            }/yr
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <ul className="space-y-4 mb-8">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-base text-muted-text font-medium leading-relaxed">
                                    <Check className={`w-5 h-5 shrink-0 mt-0.5 ${plan.color === "indigo" ? "text-indigo-600 dark:text-indigo-400" :
                                        plan.color === "purple" ? "text-purple-600 dark:text-purple-400" :
                                            plan.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                                                "text-emerald-600 dark:text-emerald-400"
                                        }`} />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        {currentPlan === plan.id && subscriptionId ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm">
                                    <Check className="w-4 h-4" />
                                    Active Plan
                                </div>
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={cancelling}
                                    className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    Cancel Subscription
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={plan.id === "free" || loadingPlan === plan.id}
                                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${plan.id === "free"
                                    ? "bg-foreground/5 text-muted-text cursor-default"
                                    : plan.recommended
                                        ? "bg-accent-primary hover:bg-accent-primary/90 text-white shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:shadow-accent-primary/40 hover:scale-[1.02]"
                                        : "bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02]"
                                    }`}

                            >
                                {loadingPlan === plan.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {plan.id !== "free" && <CreditCard className="w-4 h-4" />}
                                        {plan.cta}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Payment Info */}
            <div className="mt-8 flex justify-center items-center gap-3">
                <div className="h-[1px] w-12 bg-border-dim"></div>
                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-text flex items-center gap-2">
                    <CreditCard className="w-3 h-3" />
                    {region === "IN" ? "Securely processed by Razorpay" : "Securely processed by Lemon Squeezy"}
                </p>
                <div className="h-[1px] w-12 bg-border-dim"></div>
            </div>

            <div className="mt-16 text-center bg-card border border-border-dim rounded-2xl p-8 max-w-3xl mx-auto">
                <h4 className="text-lg font-bold text-foreground mb-4">Enterprise Custom Plans</h4>
                <p className="text-muted-text mb-6">
                    Need more than 5 seats or custom API integration? We offer tailored solutions for large design teams.
                </p>
                <button
                    onClick={() => handleSubscribe('enterprise')}
                    className="text-accent-primary font-bold hover:underline"
                >
                    Contact Enterprise Support →
                </button>
            </div >

            {/* Razorpay Backdrop & Loading State */}
            <AnimatePresence>
                {
                    loadingPlan && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-center"
                        >
                            {/* Blurred Backdrop */}
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" />

                            {/* Loading Content */}
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="relative z-10 max-w-sm w-full bg-card border border-border-dim p-8 rounded-3xl shadow-2xl"
                            >
                                <div className="w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Secure Checkout</h3>
                                <p className="text-muted-text text-sm mb-6">
                                    {region === "IN"
                                        ? "We're securely initializing your session with Razorpay. Please do not refresh."
                                        : "We're securely initializing your session with Lemon Squeezy. Please do not refresh."
                                    }
                                </p>
                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-text">
                                    <Lock className="w-3 h-3" /> 256-bit SSL Encryption
                                </div>
                            </motion.div>

                            {/* Emergency Close (Hidden but accessible if someone gets stuck) */}
                            <button
                                onClick={() => setLoadingPlan(null)}
                                className="absolute bottom-10 text-muted-text hover:text-foreground text-xs font-bold transition-colors"
                            >
                                Cancel Initialization
                            </button>
                        </motion.div>
                    )
                }
            </AnimatePresence>
            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
            />
        </div >
    );
}
