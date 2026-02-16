"use client";

import { useAuth } from "@/components/auth-provider";
import { UserProfileButton } from "@/components/user-profile-button";
import {
    Zap, LayoutDashboard, ShieldCheck, Image as ImageIcon,
    Rocket, Eye, GitCompare, Sparkles, ArrowRight, Menu, X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import NextImage from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

/* ─── Floating UI Card (decorative hero element) ─── */
function FloatingCard({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay, ease: "easeOut" }}
            className={`absolute hidden lg:flex items-center gap-2 px-4 py-3 rounded-2xl
                bg-card/60 backdrop-blur-xl border border-border-dim/50
                shadow-lg shadow-black/10 dark:shadow-black/40 ${className}`}
        >
            {children}
        </motion.div>
    );
}

export default function HomePageClient() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefsRef = useRef<(HTMLElement | null)[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const { user, loading } = useAuth();

    const { scrollY } = useScroll();
    const blob1Y = useTransform(scrollY, [0, 1000], [0, 400]);
    const blob2Y = useTransform(scrollY, [0, 1000], [0, -400]);
    const heroTextY = useTransform(scrollY, [0, 500], [0, 120]);
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

    /* ── Mouse glow tracking ── */
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    /* ── Card glow effect (mouse proximity) ── */
    useEffect(() => {
        const updateGlow = () => {
            cardRefsRef.current.forEach((card) => {
                if (card) {
                    const rect = card.getBoundingClientRect();
                    const cardCenterX = rect.left + rect.width / 2;
                    const cardCenterY = rect.top + rect.height / 2;
                    const distance = Math.sqrt(
                        Math.pow(mousePos.x - cardCenterX, 2) + Math.pow(mousePos.y - cardCenterY, 2)
                    );
                    const maxDistance = 350;
                    const intensity = Math.max(0, 1 - distance / maxDistance);
                    const angle = Math.atan2(mousePos.y - cardCenterY, mousePos.x - cardCenterX);

                    const background = `radial-gradient(
                        circle at ${Math.cos(angle) * 100 + 50}% ${Math.sin(angle) * 100 + 50}%,
                        rgba(99, 102, 241, ${intensity * 0.35}) 0%,
                        rgba(99, 102, 241, ${intensity * 0.08}) 40%,
                        transparent 70%
                    )`;
                    const boxShadow = `0 0 ${20 + intensity * 30}px rgba(99, 102, 241, ${intensity * 0.4})`;

                    const glowLayer = card.querySelector(".glow-layer") as HTMLElement;
                    if (glowLayer) {
                        glowLayer.style.background = background;
                        glowLayer.style.boxShadow = boxShadow;
                    }
                }
            });
            animationFrameRef.current = requestAnimationFrame(updateGlow);
        };

        animationFrameRef.current = requestAnimationFrame(updateGlow);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [mousePos]);

    /* ── Feature data ── */
    const features = [
        { icon: ImageIcon, title: "Upload or URL", desc: "Paste screenshots or analyze a live site with instant captures.", delay: 0 },
        { icon: ShieldCheck, title: "Industry Heuristics", desc: "Nielsen, WCAG 2.1, and Gestalt guidance synthesized for you.", delay: 0.15 },
        { icon: LayoutDashboard, title: "Exportable Reports", desc: "Generate official PDF findings for stakeholders and teammates.", delay: 0.3 },
    ];

    const advancedFeatures = [
        { icon: Rocket, title: "Site Crawler", desc: "Batch audit entire sites. Screenshot every page and surface regressions automatically.", bgColor: "bg-blue-500/10", textColor: "text-blue-500 dark:text-blue-400", borderColor: "hover:border-blue-500/30", shadowColor: "hover:shadow-blue-500/10", href: "/dashboard?mode=crawler", delay: 0 },
        { icon: GitCompare, title: "Competitor Compare", desc: "Run audits on competitor UIs and compare scores side-by-side.", bgColor: "bg-purple-500/10", textColor: "text-purple-500 dark:text-purple-400", borderColor: "hover:border-purple-500/30", shadowColor: "hover:shadow-purple-500/10", href: "/compare", delay: 0.15 },
        { icon: Eye, title: "Accessibility Testing", desc: "Persona-based testing: low-vision, keyboard-only, screen reader flows.", bgColor: "bg-emerald-500/10", textColor: "text-emerald-500 dark:text-emerald-400", borderColor: "hover:border-emerald-500/30", shadowColor: "hover:shadow-emerald-500/10", href: "/dashboard?mode=accessibility", delay: 0.3 },
    ];

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors duration-500" ref={containerRef}>

            {/* ═══════════════════════════════════════════════════
                NAVIGATION — sticky, glassmorphic, responsive
            ═══════════════════════════════════════════════════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border-dim/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <NextImage
                            src="/uixscore-logo.png" alt="UIXScore"
                            width={36} height={36}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                            priority
                        />
                        <span className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                            UIXScore<span className="text-indigo-500">.</span>
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="#features" className="px-4 py-2 text-sm font-medium text-muted-text hover:text-foreground transition-colors rounded-lg hover:bg-foreground/5">Features</Link>
                        <Link href="/pricing" className="px-4 py-2 text-sm font-medium text-muted-text hover:text-foreground transition-colors rounded-lg hover:bg-foreground/5">Pricing</Link>
                        <Link href="/blog" className="px-4 py-2 text-sm font-medium text-muted-text hover:text-foreground transition-colors rounded-lg hover:bg-foreground/5">Blog</Link>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />

                        {!loading && (
                            <>
                                {!user ? (
                                    <Link href="/login" className="hidden sm:inline-flex px-5 py-2 bg-background/50 backdrop-blur border border-border-dim hover:border-indigo-500/50 hover:bg-indigo-500/10 text-foreground rounded-full font-semibold text-sm transition-all duration-300">
                                        Sign In
                                    </Link>
                                ) : (
                                    <div className="hidden md:block">
                                        <UserProfileButton />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl border border-border-dim bg-foreground/5 hover:bg-foreground/10 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* ── Mobile menu dropdown ── */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden border-t border-border-dim/50 bg-background/95 backdrop-blur-2xl overflow-hidden"
                        >
                            <div className="px-4 py-4 flex flex-col gap-1">
                                <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-medium text-muted-text hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors">Features</Link>
                                <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-medium text-muted-text hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors">Pricing</Link>
                                <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-medium text-muted-text hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors">Blog</Link>
                                {!loading && !user && (
                                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-2 px-4 py-3 text-sm font-semibold text-center text-indigo-500 bg-indigo-500/10 rounded-xl transition-colors hover:bg-indigo-500/15">Sign In</Link>
                                )}
                                {!loading && user && (
                                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="mt-2 px-4 py-3 text-sm font-semibold text-center text-indigo-500 bg-indigo-500/10 rounded-xl transition-colors hover:bg-indigo-500/15">Dashboard</Link>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ═══════════════════════════════════════════════════
                HERO SECTION — full viewport, bold hierarchy
            ═══════════════════════════════════════════════════ */}
            <section className="relative overflow-hidden min-h-screen flex flex-col justify-center hero-grid-pattern">
                {/* Background blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div style={{ y: blob1Y }} className="absolute top-1/4 left-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-indigo-600/15 rounded-full blur-[120px] sm:blur-[160px] animate-pulse-glow" />
                    <motion.div style={{ y: blob2Y }} className="absolute bottom-1/4 right-1/4 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] bg-purple-600/10 rounded-full blur-[140px] sm:blur-[180px] animate-pulse-glow" />
                    {/* Radial vignette overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)]" />
                </div>

                {/* Decorative floating cards — responsive breakpoint: hidden on mobile/tablet */}
                <FloatingCard className="top-[22%] left-[5%] animate-float" delay={1.0}>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-xs">
                        <p className="font-semibold text-foreground">Score: 94</p>
                        <p className="text-muted-text">Excellent UX</p>
                    </div>
                </FloatingCard>

                <FloatingCard className="top-[30%] right-[6%] animate-float-reverse" delay={1.3}>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-xs">
                        <p className="font-semibold text-foreground">WCAG 2.1</p>
                        <p className="text-muted-text">AAA Pass</p>
                    </div>
                </FloatingCard>

                <FloatingCard className="bottom-[28%] left-[8%] animate-float-slow" delay={1.6}>
                    <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-1.5 rounded-full ${i < 4 ? 'bg-indigo-500' : 'bg-indigo-500/30'}`} style={{ height: `${12 + Math.random() * 16}px` }} />
                        ))}
                    </div>
                    <span className="text-xs text-muted-text ml-1">Analytics</span>
                </FloatingCard>

                <FloatingCard className="bottom-[24%] right-[7%] animate-float" delay={1.9}>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <LayoutDashboard className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-xs">
                        <p className="font-semibold text-foreground">PDF Ready</p>
                        <p className="text-muted-text">Export report</p>
                    </div>
                </FloatingCard>

                {/* Hero content */}
                <motion.div
                    style={{ y: heroTextY, opacity: heroOpacity }}
                    className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 text-center pt-24 sm:pt-28"
                >
                    {/* Tagline badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="inline-block mb-8 sm:mb-10"
                    >
                        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm font-bold tracking-wider uppercase backdrop-blur-xl">
                            <Sparkles className="w-3.5 h-3.5" />
                            The New Standard in UI Auditing
                        </span>
                    </motion.div>

                    {/* Main heading — responsive display typography */}
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
                        className="text-display gradient-text mb-6 sm:mb-8 px-2"
                    >
                        Design Perfect{" "}
                        <br className="hidden sm:block" />
                        Experiences.
                    </motion.h1>

                    {/* Subheading */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-body-lg text-muted-text max-w-2xl mx-auto mb-10 sm:mb-14 px-4"
                    >
                        AI-powered insights to elevate your user experience instantly.
                        Audit screenshots or live URLs with <span className="text-foreground font-medium">precision</span>.
                    </motion.p>

                    {/* CTA buttons — primary/secondary hierarchy */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    >
                        {/* Primary CTA */}
                        <Link
                            href="/dashboard"
                            className="group relative w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-base sm:text-lg transition-all duration-300 hover:scale-[1.03] shadow-[0_0_50px_-12px_rgba(99,102,241,0.6)] hover:shadow-[0_0_60px_-8px_rgba(99,102,241,0.7)] flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover:animate-shine" />
                            <Rocket className="w-5 h-5" />
                            Launch Dashboard
                        </Link>

                        {/* Secondary CTA */}
                        <Link
                            href="#features"
                            className="group w-full sm:w-auto px-8 py-4 bg-transparent border border-border-dim hover:border-foreground/25 text-foreground rounded-full font-bold text-base sm:text-lg transition-all duration-300 hover:bg-foreground/5 flex items-center justify-center gap-2"
                        >
                            Explore Features
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </Link>
                    </motion.div>

                    {/* Product Hunt badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.9 }}
                        className="mt-12 sm:mt-16 flex justify-center"
                    >
                        <a href="https://www.producthunt.com/products/uixscore?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-uixscore" target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform duration-300 inline-block">
                            <img
                                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1073900&theme=dark"
                                alt="UIXScore on Product Hunt"
                                width="250"
                                height="54"
                                className="w-[220px] sm:w-[250px] h-auto"
                            />
                        </a>
                    </motion.div>
                </motion.div>

                {/* Bottom gradient fade into next section */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </section>

            {/* ═══════════════════════════════════════════════════
                FEATURES SECTION — 3-column cards with glow
            ═══════════════════════════════════════════════════ */}
            <section id="features" className="relative z-10 py-24 sm:py-32 lg:py-40">
                {/* Subtle section background */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-16 sm:mb-20 lg:mb-24"
                    >
                        <h2 className="text-h2 text-foreground mb-5 sm:mb-6">
                            Everything You Need to{" "}
                            <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Audit Perfect UIs</span>
                        </h2>
                        <p className="text-base sm:text-lg text-muted-text max-w-2xl mx-auto leading-relaxed">
                            Stop guessing. Get objective, AI-driven insights to improve your designs instantly.
                        </p>
                    </motion.div>

                    {/* Feature cards — responsive grid: 1 col mobile, 2 col tablet, 3 col desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
                        {features.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-80px" }}
                                    transition={{ duration: 0.6, delay: feature.delay }}
                                    ref={(el) => { if (el) cardRefsRef.current[idx] = el; }}
                                    className="group card-accent-border bg-card/50 backdrop-blur-sm border border-border-dim rounded-2xl sm:rounded-3xl p-7 sm:p-9 relative overflow-hidden transition-all duration-500 hover:border-indigo-500/30 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/10"
                                >
                                    <div className="glow-layer absolute inset-0 pointer-events-none rounded-2xl sm:rounded-3xl opacity-50 dark:opacity-100" />
                                    <div className="relative z-10">
                                        {/* Icon container — 64px with gradient background */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500/15 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 sm:mb-7 group-hover:scale-110 group-hover:from-indigo-500/25 group-hover:to-purple-500/15 transition-all duration-500">
                                            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 group-hover:rotate-6 transition-transform duration-500" />
                                        </div>
                                        <h3 className="text-h3 mb-3 text-foreground">{feature.title}</h3>
                                        <p className="text-sm sm:text-base text-muted-text leading-relaxed">{feature.desc}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                ADVANCED TOOLS SECTION — darker bg, accent borders
            ═══════════════════════════════════════════════════ */}
            <section className="relative z-10 py-24 sm:py-32 lg:py-40">
                {/* Section background — subtle dark gradient for separation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 top-0"><div className="section-divider" /></div>

                <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-14 sm:mb-18 lg:mb-20"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold tracking-wider uppercase mb-6">
                            <Zap className="w-3.5 h-3.5" />
                            Advanced
                        </div>
                        <h2 className="text-h2 text-foreground mb-5">Advanced Audit Tools</h2>
                        <p className="text-base sm:text-lg text-muted-text max-w-2xl mx-auto leading-relaxed">
                            Go beyond basic usability testing with our specialized capabilities.
                        </p>
                    </motion.div>

                    {/* Advanced feature cards — responsive grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
                        {advancedFeatures.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: feature.delay }}
                                    className="h-full"
                                >
                                    <Link
                                        href={feature.href}
                                        ref={(el: any) => { if (el instanceof HTMLElement) cardRefsRef.current[3 + idx] = el; }}
                                        className={`block h-full group card-accent-border bg-card/80 backdrop-blur-sm border border-border-dim rounded-2xl sm:rounded-3xl p-7 sm:p-9 relative overflow-hidden transition-all duration-500 cursor-pointer ${feature.borderColor} hover:-translate-y-1.5 hover:shadow-2xl ${feature.shadowColor}`}
                                    >
                                        <div className="glow-layer absolute inset-0 pointer-events-none rounded-2xl sm:rounded-3xl" />
                                        <div className="relative z-10">
                                            <div className={`w-13 h-13 sm:w-14 sm:h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 sm:mb-7 group-hover:scale-110 transition-transform duration-500`}>
                                                <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${feature.textColor} group-hover:rotate-6 transition-transform duration-500`} />
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-bold mb-3 text-foreground tracking-tight">{feature.title}</h3>
                                            <p className="text-sm sm:text-base text-muted-text leading-relaxed mb-6">{feature.desc}</p>
                                            <p className={`text-xs sm:text-sm ${feature.textColor} font-bold group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1.5`}>
                                                Launch Feature <ArrowRight className="w-3.5 h-3.5" />
                                            </p>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                FOOTER — links, credits, polished layout
            ═══════════════════════════════════════════════════ */}
            <footer className="relative border-t border-border-dim bg-card/30 backdrop-blur-lg">
                {/* Gradient top border for visual separation */}
                <div className="absolute inset-x-0 top-0">
                    <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                </div>

                <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                        {/* Brand column */}
                        <div className="flex flex-col items-center md:items-start gap-5">
                            <Link href="/" className="flex items-center gap-2.5">
                                <NextImage src="/uixscore-logo.png" alt="UIXScore" width={32} height={32} className="w-7 h-7 rounded-lg object-contain" />
                                <span className="text-base font-black text-foreground tracking-tight">UIXScore<span className="text-indigo-500">.</span></span>
                            </Link>
                            <p className="text-sm text-muted-text text-center md:text-left leading-relaxed max-w-xs">
                                AI-powered UX audits and accessibility testing for modern web apps.
                            </p>
                            <a href="https://www.producthunt.com/products/uixscore?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-uixscore" target="_blank" rel="noopener noreferrer">
                                <img
                                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1073900&theme=dark"
                                    alt="UIXScore on Product Hunt"
                                    width="200"
                                    height="43"
                                    className="w-[160px] h-auto hover:opacity-80 transition-opacity"
                                />
                            </a>
                        </div>

                        {/* Quick links */}
                        <div className="flex flex-col items-center md:items-start gap-3">
                            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">Product</h4>
                            <Link href="#features" className="text-sm text-muted-text hover:text-foreground transition-colors">Features</Link>
                            <Link href="/pricing" className="text-sm text-muted-text hover:text-foreground transition-colors">Pricing</Link>
                            <Link href="/blog" className="text-sm text-muted-text hover:text-foreground transition-colors">Blog</Link>
                            <Link href="/dashboard" className="text-sm text-muted-text hover:text-foreground transition-colors">Dashboard</Link>
                        </div>

                        {/* Legal / credits */}
                        <div className="flex flex-col items-center md:items-start gap-3">
                            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">Connect</h4>
                            <a href="https://devu.is-great.net" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-text hover:text-foreground transition-colors">
                                Built by Devgghya Kulshrestha
                            </a>
                            <a href="https://www.producthunt.com/products/uixscore" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-text hover:text-foreground transition-colors">
                                Product Hunt
                            </a>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-10 sm:mt-12 pt-6 border-t border-border-dim/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-text">
                        <p>© {new Date().getFullYear()} UIXScore. All rights reserved.</p>
                        <p className="flex items-center gap-1.5">
                            Made with <span className="text-red-400">♥</span> for great UX
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
