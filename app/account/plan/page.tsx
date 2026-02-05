"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ArrowLeft, CreditCard, CheckCircle, Calendar, Zap, Shield, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface UsageData {
    plan: "guest" | "free" | "pro" | "enterprise";
    audits_used: number;
    limit: number | null;
    token_limit: number;
    plan_expires_at: string | null;
}

export default function PlanPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUsage() {
            try {
                const res = await fetch("/api/usage");
                const data = await res.json();
                setUsage(data);
            } catch (err) {
                console.error("Failed to load usage", err);
            } finally {
                setLoading(false);
            }
        }
        if (user) {
            fetchUsage();
        } else if (!authLoading) {
            setLoading(false); // Not logged in
        }
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        router.push("/login");
        return null;
    }

    const planName = usage?.plan ? usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1) : "Free";
    const isPro = usage?.plan === "pro";
    const isEnterprise = usage?.plan === "enterprise";

    // Calculate progress
    const auditsUsed = usage?.audits_used || 0;
    const auditLimit = usage?.limit;
    const progress = auditLimit ? Math.min((auditsUsed / auditLimit) * 100, 100) : 0;

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-8 text-white">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8 flex flex-col gap-4">
                    <Link
                        href="/account"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Account
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            My Plan
                        </h1>
                        <p className="text-slate-400">Manage your subscription and view usage.</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Current Plan Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#121214] border border-white/5 rounded-2xl p-8 shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Plan</div>
                                    <h2 className="text-4xl font-black text-white flex items-center gap-3">
                                        {planName}
                                        {isPro && <Zap className="w-6 h-6 text-indigo-400" />}
                                        {isEnterprise && <Shield className="w-6 h-6 text-emerald-400" />}
                                    </h2>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${isPro || isEnterprise
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-700"
                                    }`}>
                                    {isPro || isEnterprise ? "Active" : "Free Tier"}
                                </div>
                            </div>

                            {usage?.plan_expires_at && (
                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                                    <Calendar className="w-4 h-4 text-indigo-400" />
                                    <span>Plan expires on <span className="text-white font-bold">{new Date(usage.plan_expires_at).toLocaleDateString()}</span></span>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <Link
                                    href="/dashboard?tab=pricing"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    {isPro || isEnterprise ? "Manage Subscription" : "Upgrade Plan"}
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                    {/* Usage Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#121214] border border-white/5 rounded-2xl p-8 shadow-xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-indigo-400" /> Usage Statistics
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-2">
                                    <span className="text-slate-400">Audits Used</span>
                                    <span className="text-white">
                                        {auditsUsed} / {auditLimit === null ? "Unlimited" : auditLimit}
                                    </span>
                                </div>
                                {auditLimit !== null && (
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                                {auditLimit === null && (
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50" />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                <div className="p-4 bg-slate-900/50 border border-white/5 rounded-xl">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Plan Limit</div>
                                    <div className="text-xl font-bold text-white">{auditLimit === null ? "Unlimited" : auditLimit} audits/mo</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}
