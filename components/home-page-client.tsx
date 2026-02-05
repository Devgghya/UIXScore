"use client";

import { useAuth } from "@/components/auth-provider";
import { UserProfileButton } from "@/components/user-profile-button";
import { Zap, LayoutDashboard, ShieldCheck, Image as ImageIcon, Rocket, Eye, GitCompare, Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Link from "next/link";
import NextImage from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePageClient() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefsRef = useRef<(HTMLElement | null)[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const { user, loading } = useAuth();

    const { scrollY } = useScroll();
    const blob1Y = useTransform(scrollY, [0, 1000], [0, 400]);
    const blob2Y = useTransform(scrollY, [0, 1000], [0, -400]);
    const heroTextY = useTransform(scrollY, [0, 400], [0, 150]);
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

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
                    const maxDistance = 300;
                    const intensity = Math.max(0, 1 - distance / maxDistance);
                    const angle = Math.atan2(mousePos.y - cardCenterY, mousePos.x - cardCenterX);

                    const background = `radial-gradient(
            circle at ${Math.cos(angle) * 100 + 50}% ${Math.sin(angle) * 100 + 50}%,
            rgba(99, 102, 241, ${intensity * 0.4}) 0%,
            rgba(99, 102, 241, ${intensity * 0.1}) 40%,
            transparent 70%
          )`;
                    const boxShadow = `0 0 ${20 + intensity * 30}px rgba(99, 102, 241, ${intensity * 0.5})`;

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

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors duration-500" ref={containerRef}>
            {/* Hero */}
            <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center">
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div style={{ y: blob1Y, rotate: blob1Y }} className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />
                    <motion.div style={{ y: blob2Y, rotate: blob2Y }} className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
                </div>

                {/* Navigation Header */}
                <div className="absolute top-0 left-0 right-0 z-50 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3">
                        <NextImage src="/uixscore-logo.png" alt="UIXScore" width={40} height={40} className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-contain drop-shadow-2xl" priority />
                        <span className="text-xl md:text-2xl font-black text-foreground tracking-tight">UIXScore<span className="text-indigo-500">.</span></span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <ThemeToggle />
                        {!loading && (
                            <>
                                {!user ? (
                                    <Link href="/login" className="px-5 py-2.5 bg-background/50 backdrop-blur-md border border-border-dim hover:border-indigo-500/50 hover:bg-indigo-500/10 text-foreground rounded-full font-bold text-sm transition-all">
                                        Sign In
                                    </Link>
                                ) : (
                                    <div className="hidden md:block">
                                        <UserProfileButton />
                                    </div>
                                )}
                                {user && (
                                    <Link href="/dashboard" className="md:hidden">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                                            {user.firstName?.[0] || user.email[0].toUpperCase()}
                                        </div>
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <motion.div
                    style={{ y: heroTextY, opacity: heroOpacity }}
                    className="relative z-10 max-w-5xl mx-auto px-6 text-center"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="inline-block mb-6"
                    >
                        <span className="px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-bold tracking-wider uppercase backdrop-blur-xl">
                            The New Standard in UI Auditing
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground to-foreground/40 drop-shadow-sm"
                    >
                        Design Perfect <br /> Experiences.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-lg md:text-2xl text-muted-text max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
                    >
                        AI-powered insights to elevate your user experience instantly.
                        Audit screenshots or live URLs with <span className="text-foreground">precision</span>.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-wrap gap-4 justify-center"
                    >
                        <Link href="/dashboard" className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] flex items-center gap-3 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover:animate-shine" />
                            <Rocket className="w-5 h-5" /> Launch Dashboard
                        </Link>
                        <Link href="#features" className="px-8 py-4 bg-background border border-border-dim hover:border-foreground/20 text-foreground rounded-full font-bold text-lg transition-all hover:bg-foreground/5">
                            Explore Features
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="mt-12 flex justify-center"
                    >
                        <a href="https://www.producthunt.com/products/uixscore?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-uixscore" target="_blank" rel="noopener noreferrer">
                            <img
                                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1073900&theme=dark"
                                alt="UIXScore - Fix UX flaws and accessibility bugs in 15 seconds | Product Hunt"
                                width="250"
                                height="54"
                                className="w-[250px] h-[54px] hover:scale-105 transition-transform duration-300"
                            />
                        </a>
                    </motion.div>

                </motion.div>
            </section>

            {/* Features */}
            <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
                {/* New Section Header for IA */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-24"
                >
                    <h2 className="text-4xl md:text-7xl font-black text-foreground mb-6 tracking-tighter">Everything You Need to <br /><span className="text-indigo-500">Audit Perfect UIs</span></h2>
                    <p className="text-xl text-muted-text max-w-2xl mx-auto">
                        Stop guessing. Get objective, AI-driven insights to improve your designs instantly.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: ImageIcon, title: "Upload or URL", desc: "Paste screenshots or analyze a live site with instant captures.", color: "indigo", delay: 0 },
                        { icon: ShieldCheck, title: "Industry Heuristics", desc: "Nielsen, WCAG 2.1, and Gestalt guidance synthesized for you.", color: "emerald", delay: 0.2 },
                        { icon: LayoutDashboard, title: "Exportable Reports", desc: "Generate official PDF findings for stakeholders and teammates.", color: "amber", delay: 0.4 },
                    ].map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: feature.delay }}
                                ref={(el) => { if (el) cardRefsRef.current[idx] = el; }}
                                className="group bg-card/50 backdrop-blur-sm border border-border-dim rounded-3xl p-8 relative overflow-hidden transition-all duration-500 hover:border-indigo-500/30 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10"
                            >
                                <div className="glow-layer absolute inset-0 pointer-events-none rounded-3xl opacity-50 dark:opacity-100" />
                                <div className="relative z-10">
                                    <div className={`w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:bg-indigo-500/20`}>
                                        <Icon className={`w-7 h-7 text-indigo-500 group-hover:rotate-12 transition-transform duration-500`} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-foreground tracking-tight">{feature.title}</h3>
                                    <p className="text-base text-muted-text leading-relaxed">{feature.desc}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* Advanced Features */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 pb-40">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <h3 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">Advanced Audit Tools</h3>
                    <p className="text-xl text-muted-text max-w-2xl mx-auto">Go beyond basic usability testing with our specialized capabilities.</p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: Rocket, title: "Site Crawler", desc: "Batch audit entire sites. Screenshot every page and surface regressions automatically.", bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400", href: "/dashboard?mode=crawler", delay: 0 },
                        { icon: GitCompare, title: "Competitor Compare", desc: "Run audits on competitor UIs and compare scores side-by-side.", bgColor: "bg-purple-500/10", textColor: "text-purple-600 dark:text-purple-400", href: "/compare", delay: 0.2 },
                        { icon: Eye, title: "Accessibility Testing", desc: "Persona-based testing: low-vision, keyboard-only, screen reader flows.", bgColor: "bg-emerald-500/10", textColor: "text-emerald-600 dark:text-emerald-400", href: "/dashboard?mode=accessibility", delay: 0.4 },
                    ].map((feature, idx) => {
                        const Icon = feature.icon;
                        const CardComponent = (feature.href ? Link : "div") as any;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: feature.delay }}
                                className="h-full"
                            >
                                <CardComponent
                                    {...(feature.href ? { href: feature.href } : {})}
                                    ref={(el: any) => { if (el instanceof HTMLElement) cardRefsRef.current[3 + idx] = el; }}
                                    className={`block h-full group bg-card border border-border-dim rounded-3xl p-8 relative overflow-hidden transition-all duration-500 ${feature.href ? "cursor-pointer hover:border-indigo-500/30 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10" : "opacity-75 hover:opacity-100"}`}
                                >
                                    <div className="glow-layer absolute inset-0 pointer-events-none rounded-3xl" />
                                    <div className="relative z-10">
                                        <div className={`w-12 h-12 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                            <Icon className={`w-6 h-6 ${feature.textColor} group-hover:rotate-12 transition-transform duration-500`} />
                                        </div>
                                        <h4 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h4>
                                        <p className="text-sm text-muted-text leading-relaxed">{feature.desc}</p>
                                        {feature.href && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-6 font-bold group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1">Launch Feature <ArrowRight className="w-3 h-3" /></p>}
                                    </div>
                                </CardComponent>
                            </motion.div>
                        );
                    })}
                </div>
            </section>
            <footer className="border-t border-border-dim bg-card/30 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto px-6 py-12 text-muted-text text-sm flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <p>
                            © {new Date().getFullYear()} UIXScore. All rights reserved.
                        </p>
                        <a href="https://www.producthunt.com/products/uixscore?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-uixscore" target="_blank" rel="noopener noreferrer">
                            <img
                                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1073900&theme=dark"
                                alt="UIXScore - Fix UX flaws and accessibility bugs in 15 seconds | Product Hunt"
                                width="250"
                                height="54"
                                className="w-[180px] h-auto hover:opacity-80 transition-opacity"
                            />
                        </a>
                    </div>
                    <p className="flex items-center gap-1">
                        Built by <a href="https://devu.is-great.net" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-indigo-500 font-bold transition-colors">Devgghya Kulshrestha</a>
                    </p>
                </div>
            </footer>
        </main>
    );
}
