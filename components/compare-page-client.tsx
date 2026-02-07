"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Plus, Trash2, BarChart3, Loader, Download, LayoutDashboard, GitCompare, Sparkles, Trophy, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ThemeToggle } from "@/components/theme-toggle";
import dynamic from "next/dynamic";

// Dynamically import Recharts to avoid SSR issues
const RadarChart = dynamic(() => import('recharts').then(mod => mod.RadarChart), { ssr: false });
const Radar = dynamic(() => import('recharts').then(mod => mod.Radar), { ssr: false });
const PolarGrid = dynamic(() => import('recharts').then(mod => mod.PolarGrid), { ssr: false });
const PolarAngleAxis = dynamic(() => import('recharts').then(mod => mod.PolarAngleAxis), { ssr: false });
const PolarRadiusAxis = dynamic(() => import('recharts').then(mod => mod.PolarRadiusAxis), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

interface Competitor {
    id: string;
    name: string;
    url?: string;
    file?: File;
    analysis?: any;
    loading?: boolean;
}

export default function ComparePageClient() {
    const { user, loading: authLoading } = useAuth();
    const isLoaded = !authLoading;
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [yourSite, setYourSite] = useState<Competitor>({ id: "your-site", name: "Your Site" });
    const [framework, setFramework] = useState("nielsen");
    const [comparing, setComparing] = useState(false);
    const [plan, setPlan] = useState<string>("free");
    const [planLoading, setPlanLoading] = useState(true);

    // ... (Rest of the logic from original ComparePage)
    // I will copy the logic from the view_file output in Step 152
    // For brevity in this tool call, I'll implement the full file content in the write.

    useEffect(() => {
        async function checkAccess() {
            try {
                const res = await fetch("/api/usage");
                if (res.ok) {
                    const data = await res.json();
                    setPlan(data.plan || "free");
                }
            } catch (e) {
                console.error("Failed to check plan", e);
            } finally {
                setPlanLoading(false);
            }
        }
        checkAccess();
    }, []);

    const addCompetitor = () => {
        const newCompetitor: Competitor = {
            id: `competitor-${Date.now()}`,
            name: `Competitor ${competitors.length + 1}`,
            url: "",
            loading: false,
        };
        setCompetitors([...competitors, newCompetitor]);
    };

    const updateCompetitor = (id: string, updates: Partial<Competitor>) => {
        setCompetitors(
            competitors.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const removeCompetitor = (id: string) => {
        setCompetitors(competitors.filter((c) => c.id !== id));
    };

    const runComparison = async () => {
        if (!yourSite.url && !yourSite.file) {
            alert("Please enter your site URL or upload a screenshot");
            return;
        }

        if (competitors.length === 0) {
            alert("Please add at least one competitor");
            return;
        }

        setComparing(true);

        try {
            // Run audit on your site
            const yourFormData = new FormData();
            yourFormData.append("framework", framework);
            if (yourSite.url) {
                yourFormData.append("mode", "url");
                yourFormData.append("url", yourSite.url);
            } else if (yourSite.file) {
                yourFormData.append("mode", "file");
                yourFormData.append("file", yourSite.file);
            }

            const yourResponse = await fetch("/api/audit", {
                method: "POST",
                body: yourFormData,
            });
            const yourData = await yourResponse.json();
            setYourSite({ ...yourSite, analysis: yourData });

            // Run audits on all competitors
            const updatedCompetitors = await Promise.all(
                competitors.map(async (comp) => {
                    if (!comp.url) return comp;

                    const formData = new FormData();
                    formData.append("framework", framework);
                    formData.append("mode", "url");
                    formData.append("url", comp.url!);

                    const response = await fetch("/api/audit", {
                        method: "POST",
                        body: formData,
                    });
                    const data = await response.json();
                    return { ...comp, analysis: data };
                })
            );

            setCompetitors(updatedCompetitors);
        } catch (error) {
            console.error("Error running comparison:", error);
            alert("Error running comparison. Please try again.");
        } finally {
            setComparing(false);
        }
    };

    const calculateMetrics = (analysis: any) => {
        if (!analysis?.audit || !Array.isArray(analysis.audit)) {
            return {
                total: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                categories: {},
            };
        }

        const issues = analysis.audit;
        const metrics = {
            total: issues.length,
            critical: issues.filter((i: any) => i.severity === "critical").length,
            high: issues.filter((i: any) => i.severity === "high").length,
            medium: issues.filter((i: any) => i.severity === "medium").length,
            low: issues.filter((i: any) => i.severity === "low").length,
            categories: {} as Record<string, number>,
        };

        issues.forEach((issue: any) => {
            const category = issue.category || "Other";
            metrics.categories[category] = (metrics.categories[category] || 0) + 1;
        });

        return metrics;
    };

    const exportPDF = async () => {
        try {
            const jsPDF = (await import("jspdf")).default;
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const BG = { r: 255, g: 255, b: 255 };
            const CARD = { r: 248, g: 250, b: 252 };
            const ACCENT = { r: 79, g: 70, b: 229 };
            const TEXT_MAIN = { r: 2, g: 6, b: 23 };
            const TEXT_MUTED = { r: 100, g: 116, b: 139 };
            const STROKE = { r: 226, g: 232, b: 240 };

            const roundedRect = (x: number, y: number, w: number, h: number, r: number = 3) => {
                doc.roundedRect(x, y, w, h, r, r, "F");
                doc.setDrawColor(STROKE.r, STROKE.g, STROKE.b);
                doc.setLineWidth(0.1);
                doc.roundedRect(x, y, w, h, r, r, "S");
            };

            doc.setFillColor(BG.r, BG.g, BG.b);
            doc.rect(0, 0, pageWidth, pageHeight, "F");

            try {
                const logoUrl = window.location.origin + "/uixscore-logo.png";
                const logoImg = new Image();
                logoImg.src = logoUrl;
                await new Promise((resolve) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = resolve;
                });
                doc.addImage(logoImg, "PNG", 20, 25, 20, 20);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(32);
                doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
                doc.text("UIXScore", 45, 40);
            } catch (e) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(32);
                doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
                doc.text("UIXScore", 20, 40);
            }

            doc.setFontSize(24);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text("Benchmark Report", 20, 60);

            doc.setFillColor(CARD.r, CARD.g, CARD.b);
            roundedRect(20, 70, pageWidth - 40, 40);

            doc.setFontSize(10);
            doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
            doc.text("PRIMARY SITE", 30, 80);
            doc.setFontSize(14);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text(yourSite.name, 30, 88);

            doc.setFontSize(10);
            doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
            doc.text("COMPETITORS", 100, 80);
            doc.setFontSize(14);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text(`${competitors.length} Sites Analyzed`, 100, 88);

            doc.setFontSize(10);
            doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
            doc.text("DATE", pageWidth - 60, 80);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text(new Date().toLocaleDateString(), pageWidth - 60, 88);

            doc.setFontSize(14);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text("UX Score Comparison", 20, 125);

            // Score Cards Row
            const allSites = [
                { name: yourSite.name, analysis: yourSite.analysis, isYours: true },
                ...competitors.map(c => ({ name: c.name, analysis: c.analysis, isYours: false }))
            ];
            const maxScore = Math.max(...allSites.map(s => s.analysis?.score || 0));
            let scoreX = 20;
            const scoreCardWidth = (pageWidth - 40 - (allSites.length - 1) * 5) / allSites.length;

            allSites.forEach((site) => {
                const score = site.analysis?.score || 0;
                const scoreColor = score >= 80 ? [16, 185, 129] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
                const isWinner = score === maxScore && score > 0;

                doc.setFillColor(CARD.r, CARD.g, CARD.b);
                roundedRect(scoreX, 130, scoreCardWidth, 35);

                // Winner badge
                if (isWinner) {
                    doc.setFillColor(245, 158, 11);
                    doc.roundedRect(scoreX + scoreCardWidth - 25, 132, 22, 8, 2, 2, "F");
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(6);
                    doc.setFont("helvetica", "bold");
                    doc.text("WINNER", scoreX + scoreCardWidth - 14, 137, { align: "center" });
                }

                // Site name
                doc.setFontSize(8);
                doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
                doc.setFont("helvetica", "normal");
                const siteName = site.name.substring(0, 12) + (site.name.length > 12 ? '...' : '');
                doc.text((site.isYours ? "★ " : "") + siteName, scoreX + 5, 138);

                // Score
                doc.setFontSize(20);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
                doc.text(score.toString(), scoreX + 5, 155);

                // /100 label
                doc.setFontSize(8);
                doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
                doc.text("/100", scoreX + 25, 155);

                scoreX += scoreCardWidth + 5;
            });

            // High-Level Comparison Title
            doc.setFontSize(14);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text("UX Metrics Breakdown", 20, 180);

            // Metrics Table
            const metricsTableData: any[] = [["METRIC", yourSite.name, ...competitors.map((c) => c.name)]];
            const metricKeys = ['clarity', 'efficiency', 'consistency', 'aesthetics', 'accessibility'];
            metricKeys.forEach(key => {
                const yourVal = Math.round((yourSite.analysis?.ux_metrics?.[key] || 0) * 10);
                const compVals = competitors.map(c => Math.round((c.analysis?.ux_metrics?.[key] || 0) * 10));
                metricsTableData.push([key.charAt(0).toUpperCase() + key.slice(1), yourVal, ...compVals]);
            });

            autoTable(doc, {
                head: [metricsTableData[0]],
                body: metricsTableData.slice(1),
                startY: 185,
                theme: "grid",
                headStyles: {
                    fillColor: [CARD.r, CARD.g, CARD.b],
                    textColor: [ACCENT.r, ACCENT.g, ACCENT.b],
                    fontStyle: "bold",
                    lineWidth: 0
                },
                bodyStyles: {
                    fillColor: [BG.r, BG.g, BG.b],
                    textColor: [TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b],
                    lineWidth: 0.1,
                    lineColor: [STROKE.r, STROKE.g, STROKE.b]
                },
                alternateRowStyles: { fillColor: [BG.r, BG.g, BG.b] },
                styles: { fontSize: 9, cellPadding: 5 },
                margin: { left: 20, right: 20 },
            });

            // Add page for Issues Comparison
            doc.addPage();
            doc.setFillColor(BG.r, BG.g, BG.b);
            doc.rect(0, 0, pageWidth, pageHeight, "F");

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text("Issues Breakdown", 20, 20);

            const summaryData: any[] = [["METRIC", yourSite.name, ...competitors.map((c) => c.name)]];
            const yourMetrics = calculateMetrics(yourSite.analysis);
            const compMetrics = competitors.map((c) => calculateMetrics(c.analysis));

            summaryData.push(["Total Issues", yourMetrics.total, ...compMetrics.map(m => m.total)]);
            summaryData.push(["Critical", yourMetrics.critical, ...compMetrics.map(m => m.critical)]);
            summaryData.push(["High", yourMetrics.high, ...compMetrics.map(m => m.high)]);
            summaryData.push(["Medium", yourMetrics.medium, ...compMetrics.map(m => m.medium)]);
            summaryData.push(["Low", yourMetrics.low, ...compMetrics.map(m => m.low)]);

            autoTable(doc, {
                head: [summaryData[0]],
                body: summaryData.slice(1),
                startY: 30,
                theme: "grid",
                headStyles: {
                    fillColor: [CARD.r, CARD.g, CARD.b],
                    textColor: [ACCENT.r, ACCENT.g, ACCENT.b],
                    fontStyle: "bold",
                    lineWidth: 0
                },
                bodyStyles: {
                    fillColor: [BG.r, BG.g, BG.b],
                    textColor: [TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b],
                    lineWidth: 0.1,
                    lineColor: [STROKE.r, STROKE.g, STROKE.b]
                },
                alternateRowStyles: { fillColor: [BG.r, BG.g, BG.b] },
                styles: { fontSize: 10, cellPadding: 6 },
                margin: { left: 20, right: 20 },
            });

            doc.addPage();
            doc.setFillColor(BG.r, BG.g, BG.b);
            doc.rect(0, 0, pageWidth, pageHeight, "F");

            let cursorY = 20;

            [
                { name: yourSite.name, analysis: yourSite.analysis, isYours: true },
                ...competitors.map((c) => ({ name: c.name, analysis: c.analysis, isYours: false })),
            ].forEach((site) => {
                if (cursorY > pageHeight - 40) {
                    doc.addPage();
                    doc.setFillColor(BG.r, BG.g, BG.b);
                    doc.rect(0, 0, pageWidth, pageHeight, "F");
                    cursorY = 20;
                }

                doc.setFontSize(16);
                doc.setTextColor(site.isYours ? ACCENT.r : TEXT_MAIN.r, site.isYours ? ACCENT.g : TEXT_MAIN.g, site.isYours ? ACCENT.b : TEXT_MAIN.b);
                doc.setFont("helvetica", "bold");
                doc.text(site.name, 20, cursorY);
                cursorY += 10;

                const issues = site.analysis?.audit || [];
                if (issues.length === 0) {
                    doc.setFontSize(10);
                    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
                    doc.text("No significant issues detected.", 20, cursorY);
                    cursorY += 20;
                } else {
                    issues.forEach((item: any) => {
                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        const titleLines = doc.splitTextToSize(item.title || "Issue", pageWidth - 70);
                        const titleHeight = titleLines.length * 5;

                        doc.setFontSize(9);
                        doc.setFont("helvetica", "normal");
                        const descLines = doc.splitTextToSize(item.issue || "No description", pageWidth - 55);
                        const descHeight = descLines.length * 4;

                        const fixLines = doc.splitTextToSize("Fix: " + (item.solution || "No solution"), pageWidth - 55);
                        const fixHeight = fixLines.length * 4;

                        const cardHeight = 8 + titleHeight + 4 + descHeight + 6 + fixHeight + 8;

                        if (cursorY + cardHeight > pageHeight - 20) {
                            doc.addPage();
                            doc.setFillColor(BG.r, BG.g, BG.b);
                            doc.rect(0, 0, pageWidth, pageHeight, "F");
                            cursorY = 20;
                        }

                        doc.setFillColor(CARD.r, CARD.g, CARD.b);
                        roundedRect(20, cursorY, pageWidth - 40, cardHeight);

                        let contentY = cursorY + 8;

                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
                        doc.text(titleLines, 25, contentY);

                        const sev = (item.severity || "LOW").toUpperCase();
                        const sevColor = sev === "CRITICAL" ? [239, 68, 68] : sev === "HIGH" ? [245, 158, 11] : [59, 130, 246];
                        doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
                        doc.roundedRect(pageWidth - 45, cursorY + 4, 20, 6, 1, 1, "F");
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(7);
                        doc.setFont("helvetica", "bold");
                        doc.text(sev, pageWidth - 35, cursorY + 8, { align: "center" });

                        contentY += titleHeight + 4;

                        doc.setFontSize(9);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
                        doc.text(descLines, 25, contentY);

                        contentY += descHeight + 6;

                        if (item.solution) {
                            doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
                            doc.text(fixLines, 25, contentY);
                            contentY += fixHeight;
                        }

                        cursorY += cardHeight + 5;
                    });
                    cursorY += 10;
                }
            });

            const pages = doc.getNumberOfPages();
            for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text("UIXScore Benchmark Report", pageWidth - 20, pageHeight - 10, { align: "right" });
            }

            doc.save("UIXScore_Comparison_Report.pdf");

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error generating PDF. Please try again.");
        }
    };

    if (!isLoaded || planLoading) {
        return <div className="text-center py-20 flex flex-col items-center gap-4"><Loader className="w-8 h-8 animate-spin text-accent-primary" /> <p>Loading...</p></div>;
    }

    // --- PAYWALL / GATING ---
    // --- PAYWALL / GATING ---
    const isAllowed = ["pro", "enterprise", "admin", "test"].includes(plan);

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-background text-foreground p-6 pb-24 md:pb-6 relative overflow-hidden flex flex-col items-center justify-center">
                {/* Background Blur */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none blur-3xl">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600 rounded-full" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full" />
                </div>

                <div className="relative z-10 max-w-lg w-full bg-card border border-border-dim p-8 rounded-3xl shadow-2xl text-center">
                    <div className="w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
                        <GitCompare className="w-8 h-8 text-accent-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-foreground mb-4">Competitor Benchmarking</h1>
                    <p className="text-muted-text mb-8">
                        Compare your site against top competitors. Identify weaknesses, track severity metrics, and generate side-by-side PDF reports.
                    </p>

                    <div className="bg-foreground/[0.03] border border-border-dim rounded-xl p-4 mb-8">
                        <p className="text-xs font-bold text-muted-text mb-2 uppercase tracking-wider">Available on</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg text-sm font-bold">Pro Analyst</span>
                            <span className="px-3 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-lg text-sm font-bold">Enterprise</span>
                        </div>
                    </div>

                    <Link
                        href="/dashboard?tab=pricing"
                        className="block w-full py-4 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-xl font-bold shadow-lg shadow-accent-primary/25 transition-all hover:scale-[1.02]"
                    >
                        Upgrade to Unlock
                    </Link>
                    <Link href="/dashboard" className="block mt-4 text-sm text-muted-text hover:text-foreground">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 pb-24 md:pb-6 transition-colors duration-500">
            {/* MOBILE NAVIGATION BAR */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-lg border-t border-border-dim px-6 py-3 flex justify-around items-center md:hidden">
                <Link
                    href="/dashboard"
                    className="flex flex-col items-center gap-1 text-muted-text hover:text-accent-primary transition-all"
                >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Dashboard</span>
                </Link>
                <ThemeToggle />
                <Link
                    href="/compare"
                    className="flex flex-col items-center gap-1 text-accent-primary transition-all font-bold"
                >
                    <GitCompare className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Compare</span>
                </Link>
            </nav>

            {/* Back Link & Toggle */}
            <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
                <Link href="/dashboard" className="text-accent-primary hover:opacity-80 text-sm font-bold flex items-center gap-2 transition-all">
                    <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
                </Link>
                <div className="hidden md:block">
                    <ThemeToggle />
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-accent-primary/20">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">Competitor Benchmark</h1>
                    </div>
                    <p className="text-muted-text text-base md:text-xl font-medium mb-6">Audit your site and competitors side-by-side</p>

                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 text-sm text-foreground/80">
                        <h3 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> How to use this tool:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Select an evaluation framework (Nielsen's is recommended for general UX).</li>
                            <li>Enter your website URL or upload a screenshot.</li>
                            <li>Add up to 3 competitor URLs to compare performance against.</li>
                            <li>We'll generate a comparative radar chart and strength/weakness analysis.</li>
                        </ul>
                    </div>
                </div>

                {/* Framework Selection */}
                <div className="mb-8 bg-card border border-border-dim rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold mb-4 text-foreground">Heuristic Framework</label>
                    <div className="grid md:grid-cols-3 gap-4">
                        {["nielsen", "wcag", "gestalt"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFramework(f)}
                                className={`p-4 rounded-xl border-2 transition-all capitalize font-bold ${framework === f
                                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                                    : "border-border-dim bg-foreground/5 text-muted-text hover:border-border-dim/50 hover:bg-foreground/[0.08]"
                                    }`}
                            >
                                {f === "nielsen" && "Nielsen Heuristics"}
                                {f === "wcag" && "WCAG 2.1"}
                                {f === "gestalt" && "Gestalt Principles"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Your Site */}
                <div className="mb-8 bg-card border border-border-dim rounded-2xl p-6 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6 text-foreground">Your Site</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Enter your website URL"
                            value={yourSite.url || ""}
                            onChange={(e) => setYourSite({ ...yourSite, url: e.target.value })}
                            className="px-4 py-3 bg-background border border-border-dim rounded-xl text-foreground focus:outline-none focus:border-accent-primary transition-colors"
                        />
                        <div>
                            <label className="block text-sm text-muted-text mb-2">Or upload screenshot</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    setYourSite({ ...yourSite, file: e.target.files?.[0] })
                                }
                                className="w-full px-4 py-3 bg-background border border-border-dim rounded-xl text-foreground focus:outline-none focus:border-accent-primary transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Competitors */}
                <div className="mb-8 bg-card border border-border-dim rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-foreground">Competitors</h2>
                        <button
                            onClick={addCompetitor}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all text-sm shadow-lg shadow-indigo-600/20"
                        >
                            <Plus className="w-4 h-4" />
                            Add Competitor
                        </button>
                    </div>

                    {competitors.length === 0 ? (
                        <div className="text-center py-12 bg-foreground/[0.02] border-2 border-dashed border-border-dim rounded-2xl">
                            <GitCompare className="w-12 h-12 text-muted-text mx-auto mb-3 opacity-50" />
                            <p className="text-foreground font-bold text-lg mb-1">No competitors added yet.</p>
                            <p className="text-muted-text text-sm">Click "Add Competitor" above to start comparing.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {competitors.map((comp) => (
                                <div
                                    key={comp.id}
                                    className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-5 bg-background border border-border-dim rounded-xl transition-all duration-300 hover:border-accent-primary/30 shadow-sm"
                                >
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-text mb-1 uppercase tracking-wider">Company Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Acme Corp"
                                            value={comp.name}
                                            onChange={(e) => updateCompetitor(comp.id, { name: e.target.value })}
                                            className="w-full px-3 py-2 bg-foreground/[0.03] border border-border-dim rounded-lg text-foreground focus:outline-none focus:border-accent-primary text-sm font-medium"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-muted-text mb-1 uppercase tracking-wider">Website URL</label>
                                        <input
                                            type="text"
                                            placeholder="https://example.com"
                                            value={comp.url || ""}
                                            onChange={(e) => updateCompetitor(comp.id, { url: e.target.value })}
                                            className="w-full px-3 py-2 bg-foreground/[0.03] border border-border-dim rounded-lg text-foreground focus:outline-none focus:border-accent-primary text-sm font-medium"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeCompetitor(comp.id)}
                                        className="self-end md:self-center p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center shrink-0 mt-2 md:mt-0"
                                        aria-label="Remove competitor"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        <span className="md:hidden ml-2 font-bold text-sm">Remove</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Run Comparison */}
                <div className="mb-12">
                    <button
                        onClick={runComparison}
                        disabled={comparing}
                        className="group w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-lg font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/30"
                    >
                        {comparing ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                Running Audits...
                            </>
                        ) : (
                            "Analyze & Compare Sites"
                        )}
                    </button>
                </div>

                {/* Results */}
                {yourSite.analysis && competitors.some((c) => c.analysis) && (
                    <div className="bg-card border border-border-dim rounded-2xl p-6 overflow-x-auto shadow-xl">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                            <h2 className="text-2xl font-bold text-foreground">Comparison Results</h2>
                            <button
                                onClick={exportPDF}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                            >
                                <Download className="w-4 h-4" />
                                Export Benchmark Report
                            </button>
                        </div>

                        {/* UX Score Comparison Cards */}
                        <div className="mb-12">
                            <h3 className="text-lg font-bold mb-6 text-muted-text flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                UX Score Comparison
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { name: yourSite.name, analysis: yourSite.analysis, isYours: true },
                                    ...competitors.map(c => ({ name: c.name, analysis: c.analysis, isYours: false }))
                                ].map((site, idx) => {
                                    const score = site.analysis?.score || 0;
                                    const scoreColor = score >= 80
                                        ? "from-emerald-500 to-emerald-600"
                                        : score >= 60
                                            ? "from-amber-500 to-amber-600"
                                            : "from-red-500 to-red-600";
                                    const bgColor = score >= 80
                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                        : score >= 60
                                            ? "bg-amber-500/10 border-amber-500/30"
                                            : "bg-red-500/10 border-red-500/30";

                                    // Find winner (highest score)
                                    const allScores = [yourSite.analysis?.score || 0, ...competitors.map(c => c.analysis?.score || 0)];
                                    const maxScore = Math.max(...allScores);
                                    const isWinner = score === maxScore && score > 0;

                                    return (
                                        <div
                                            key={idx}
                                            className={`relative p-6 rounded-2xl border ${bgColor} ${site.isYours ? 'ring-2 ring-accent-primary' : ''}`}
                                        >
                                            {isWinner && (
                                                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                    <Trophy className="w-3 h-3" /> Winner
                                                </div>
                                            )}
                                            <p className="text-xs font-bold text-muted-text mb-2 uppercase tracking-wider truncate">
                                                {site.isYours && "⭐ "}{site.name}
                                            </p>
                                            <p className={`text-4xl font-black bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
                                                {score}
                                            </p>
                                            <p className="text-[10px] text-muted-text mt-1">OUT OF 100</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Radar Chart Comparison */}
                        <div className="mb-12">
                            <h3 className="text-lg font-bold mb-6 text-muted-text flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-accent-primary" />
                                UX Metrics Comparison
                            </h3>
                            <div className="bg-foreground/[0.02] border border-border-dim rounded-xl p-6">
                                <ResponsiveContainer width="100%" height={350}>
                                    <RadarChart
                                        data={(() => {
                                            const yourMetricsData = yourSite.analysis?.ux_metrics || {};
                                            const metricKeys = ['clarity', 'efficiency', 'consistency', 'aesthetics', 'accessibility'];
                                            return metricKeys.map(key => ({
                                                subject: key.charAt(0).toUpperCase() + key.slice(1),
                                                [yourSite.name]: (yourMetricsData[key] || 0) * 10,
                                                ...Object.fromEntries(competitors.map(c => [
                                                    c.name,
                                                    ((c.analysis?.ux_metrics?.[key] || 0) * 10)
                                                ]))
                                            }));
                                        })()}
                                    >
                                        <PolarGrid stroke="#3b3f5c" strokeOpacity={0.5} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Radar
                                            name={yourSite.name}
                                            dataKey={yourSite.name}
                                            stroke="#6366f1"
                                            fill="#6366f1"
                                            fillOpacity={0.3}
                                            strokeWidth={2}
                                        />
                                        {competitors.map((comp, idx) => {
                                            const colors = ['#f97316', '#10b981', '#ec4899'];
                                            return (
                                                <Radar
                                                    key={comp.id}
                                                    name={comp.name}
                                                    dataKey={comp.name}
                                                    stroke={colors[idx % colors.length]}
                                                    fill={colors[idx % colors.length]}
                                                    fillOpacity={0.2}
                                                    strokeWidth={2}
                                                />
                                            );
                                        })}
                                        <Legend />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Summary Table */}
                        <div className="mb-12">
                            <h3 className="text-lg font-bold mb-6 text-muted-text flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-accent-primary" />
                                Metric Breakdown
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-border-dim">
                                <table className="w-full min-w-[600px] border-collapse">
                                    <thead>
                                        <tr className="bg-foreground/[0.03]">
                                            <th className="text-left py-4 px-6 font-bold text-muted-text border-b border-border-dim">Benchmark Metric</th>
                                            <th className="text-center py-4 px-6 font-bold text-foreground border-b border-border-dim bg-accent-primary/5">{yourSite.name}</th>
                                            {competitors.map((comp) => (
                                                <th key={comp.id} className="text-center py-4 px-6 font-bold text-foreground border-b border-border-dim">
                                                    {comp.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-border-dim hover:bg-foreground/[0.01] transition-colors">
                                            <td className="py-4 px-6 font-bold text-amber-600 dark:text-amber-400">📊 Total Issues</td>
                                            <td className="text-center py-4 px-6 bg-accent-primary/[0.02]">
                                                <span className="text-2xl font-black text-amber-500">
                                                    {calculateMetrics(yourSite.analysis).total}
                                                </span>
                                            </td>
                                            {competitors.map((comp) => (
                                                <td key={comp.id} className="text-center py-4 px-6">
                                                    <span className="text-2xl font-black text-amber-500">
                                                        {calculateMetrics(comp.analysis).total}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b border-border-dim hover:bg-foreground/[0.01] transition-colors">
                                            <td className="py-4 px-6 font-bold text-red-600 dark:text-red-400">🔴 Critical Severity</td>
                                            <td className="text-center py-4 px-6 bg-accent-primary/[0.02]">
                                                <span className="text-xl font-bold text-red-500">
                                                    {calculateMetrics(yourSite.analysis).critical}
                                                </span>
                                            </td>
                                            {competitors.map((comp) => (
                                                <td key={comp.id} className="text-center py-4 px-6">
                                                    <span className="text-xl font-bold text-red-500">
                                                        {calculateMetrics(comp.analysis).critical}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b border-border-dim hover:bg-foreground/[0.01] transition-colors">
                                            <td className="py-4 px-6 font-bold text-orange-600 dark:text-orange-400">🟠 High Severity</td>
                                            <td className="text-center py-4 px-6 bg-accent-primary/[0.02]">
                                                <span className="text-xl font-bold text-orange-500">
                                                    {calculateMetrics(yourSite.analysis).high}
                                                </span>
                                            </td>
                                            {competitors.map((comp) => (
                                                <td key={comp.id} className="text-center py-4 px-6">
                                                    <span className="text-xl font-bold text-orange-500">
                                                        {calculateMetrics(comp.analysis).high}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b border-border-dim hover:bg-foreground/[0.01] transition-colors">
                                            <td className="py-4 px-6 font-bold text-yellow-600 dark:text-yellow-400">🟡 Medium Severity</td>
                                            <td className="text-center py-4 px-6 bg-accent-primary/[0.02]">
                                                <span className="text-xl font-bold text-yellow-500">
                                                    {calculateMetrics(yourSite.analysis).medium}
                                                </span>
                                            </td>
                                            {competitors.map((comp) => (
                                                <td key={comp.id} className="text-center py-4 px-6">
                                                    <span className="text-xl font-bold text-yellow-500">
                                                        {calculateMetrics(comp.analysis).medium}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Competitive Position */}
                        <div className="bg-accent-primary/5 border border-accent-primary/10 rounded-2xl p-8 mb-12 shadow-inner">
                            <h3 className="text-xl font-bold mb-6 text-foreground">Competitive Landscape</h3>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="bg-card border border-border-dim rounded-xl p-6 shadow-sm">
                                    <p className="text-muted-text text-sm font-bold mb-3 uppercase tracking-wider">Top Performer</p>
                                    <p className="text-3xl font-black text-emerald-500">
                                        {(() => {
                                            const all = [
                                                {
                                                    name: yourSite.name,
                                                    count: calculateMetrics(yourSite.analysis).total,
                                                },
                                                ...competitors.map((c) => ({
                                                    name: c.name,
                                                    count: calculateMetrics(c.analysis).total,
                                                })),
                                            ];
                                            return all.reduce((prev, current) =>
                                                prev.count < current.count ? prev : current
                                            ).name;
                                        })()}
                                    </p>
                                    <p className="text-xs text-muted-text mt-2">Fewest total UX issues detected.</p>
                                </div>
                                <div className="bg-card border border-border-dim rounded-xl p-6 shadow-sm">
                                    <p className="text-muted-text text-sm font-bold mb-3 uppercase tracking-wider">Highest Risk Area</p>
                                    <p className="text-3xl font-black text-red-500">
                                        {(() => {
                                            const all = [
                                                {
                                                    name: yourSite.name,
                                                    count: calculateMetrics(yourSite.analysis).critical,
                                                },
                                                ...competitors.map((c) => ({
                                                    name: c.name,
                                                    count: calculateMetrics(c.analysis).critical,
                                                })),
                                            ];
                                            return all.reduce((prev, current) =>
                                                prev.count > current.count ? prev : current
                                            ).name;
                                        })()}
                                    </p>
                                    <p className="text-xs text-muted-text mt-2">Most critical severity issues found.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
