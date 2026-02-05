"use client";
// Force rebuild stamp: 2

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";
import { AlertCircle, CheckCircle, Lightbulb, Zap, Lock, Image as ImageIcon } from "lucide-react";
import AnnotatedScreenshot from "@/components/AnnotatedScreenshot";

export interface ReportViewProps {
    data: any; // The full JSON response from the API
    uiTitle: string;
    imageUrl?: string; // The screenshot URL for annotation
}

export default function ReportView({ data, uiTitle, imageUrl }: ReportViewProps) {
    const [hoveredIssueIndex, setHoveredIssueIndex] = useState<number | null>(null);
    const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null);

    if (!data) return null;

    // Transform metrics for Radar Chart
    const metrics = data.ux_metrics || {};
    const radarData = Object.keys(metrics).map(key => ({
        subject: key.charAt(0).toUpperCase() + key.slice(1),
        A: metrics[key],
        fullMark: 10,
    }));

    const score = data.score || 0;
    const auditIssues = data.audit || [];

    // Color determination for score
    const scoreColor = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
    const scoreBg = score >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : score >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";

    // Scroll to issue card when marker is clicked
    const handleMarkerClick = (index: number) => {
        // Toggle selection
        setSelectedMarkerIndex(prev => prev === index ? null : index);

        // If selecting (not deselecting), scroll to the issue card
        if (selectedMarkerIndex !== index) {
            const issueCard = document.getElementById(`issue-card-${index}`);
            if (issueCard) {
                // Wait a tiny bit for state to update visuals then scroll
                setTimeout(() => {
                    issueCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    };

    // Scroll to screenshot when issue card is clicked
    const handleIssueClick = (index: number) => {
        setSelectedMarkerIndex(index);
        const screenshotSection = document.getElementById('annotated-screenshot-section');
        if (screenshotSection) {
            screenshotSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div id="audit-report-view" className="space-y-8 bg-background text-foreground p-4 md:p-8 rounded-3xl border border-border-dim shadow-xl transition-colors duration-500">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row gap-8 items-start justify-between border-b border-white/10 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-accent-primary text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">AI AUDIT</span>
                        <span className="text-muted-text text-xs font-medium">{new Date().toLocaleDateString()}</span>
                        {data.target_url && (
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {data.target_url.replace(/^https?:\/\//, '')}
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3 text-foreground leading-tight">{uiTitle}</h2>
                    <p className="text-lg md:text-xl text-muted-text max-w-2xl leading-relaxed">{data.summary?.summary_text}</p>
                </div>

                {/* SCORE CARD */}
                <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border ${scoreBg} w-full md:min-w-[180px]`}>
                    <span className="text-xs md:text-sm font-bold opacity-80 uppercase tracking-widest mb-1">UX Score</span>
                    <span className={`text-5xl md:text-6xl font-black ${scoreColor}`}>{score}</span>
                    <span className="text-[10px] md:text-xs font-bold mt-2 opacity-60">OUT OF 100</span>
                </div>
            </div>

            {/* ANNOTATED SCREENSHOT SECTION */}
            {imageUrl && auditIssues.length > 0 && (
                <div id="annotated-screenshot-section">
                    <AnnotatedScreenshot
                        imageUrl={imageUrl}
                        issues={auditIssues}
                        hoveredIssueIndex={hoveredIssueIndex}
                        selectedMarkerIndex={selectedMarkerIndex}
                        onMarkerHover={setHoveredIssueIndex}
                        onMarkerClick={handleMarkerClick}
                    />
                </div>
            )}

            {/* METRICS VISUALIZATION */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* RADAR CHART */}
                <div className="bg-card border border-border-dim rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-foreground"><Zap className="w-5 h-5 text-accent-primary" /> Performance Metrics</h3>
                    <div id="radar-chart-container" className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#94a3b8" strokeOpacity={0.2} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 12, className: 'text-muted-text font-medium' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                <Radar
                                    name="UX Metrics"
                                    dataKey="A"
                                    stroke="var(--color-accent-primary)"
                                    strokeWidth={3}
                                    fill="var(--color-accent-primary)"
                                    fillOpacity={0.2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* STRENGTHS & WEAKNESSES */}
                <div className="space-y-6">
                    <div className="bg-card border border-border-dim rounded-2xl p-6 shadow-sm hover:border-emerald-500/20 transition-colors">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground"><CheckCircle className="w-5 h-5 text-emerald-500" /> Key Strengths</h3>
                        <ul className="space-y-3">
                            {data.key_strengths?.map((s: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-muted-text">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0" />
                                    {s}
                                </li>
                            )) || <p className="text-muted-text italic">No specific strengths listed.</p>}
                        </ul>
                    </div>

                    <div className="bg-card border border-border-dim rounded-2xl p-6 shadow-sm hover:border-orange-500/20 transition-colors">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground"><AlertCircle className="w-5 h-5 text-orange-500" /> Areas for Improvement</h3>
                        <ul className="space-y-3">
                            {data.key_weaknesses?.map((w: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-muted-text">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 shrink-0" />
                                    {w}
                                </li>
                            )) || <p className="text-muted-text italic">No specific weaknesses listed.</p>}
                        </ul>
                    </div>
                </div>
            </div>

            {/* EXECUTIVE SUMMARY */}
            {data.summary?.audit && (
                <div className="bg-white dark:bg-gradient-to-r dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 md:p-8 shadow-sm dark:shadow-none">
                    <h3 className="text-lg md:text-xl font-bold mb-6 text-slate-900 dark:text-indigo-200">Executive Strategic Audit</h3>
                    <div className="space-y-6">
                        {data.summary.audit.map((item: any, idx: number) => (
                            <div key={idx}>
                                <h4 className="font-bold text-black dark:text-white text-lg mb-2">{item.title}</h4>
                                <p className="text-slate-700 dark:text-indigo-100/70 mb-3">{item.issue}</p>
                                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                    <strong className="text-indigo-700 dark:text-indigo-400 text-xs uppercase tracking-wider block mb-1">Strategic Recommendation</strong>
                                    <p className="text-sm text-slate-900 dark:text-white">{item.solution}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DETAILED ISSUES */}
            <div className="pt-8 border-t border-border-dim">
                <h3 className="text-xl md:text-2xl font-bold mb-8 text-foreground">Detailed Findings</h3>
                <div className="grid gap-6">
                    {auditIssues.map((item: any, i: number) => {
                        const isHighlighted = hoveredIssueIndex === i;
                        const severityBorderColor = item.severity === 'critical'
                            ? 'border-red-500/50 shadow-red-500/20'
                            : item.severity === 'high'
                                ? 'border-orange-500/50 shadow-orange-500/20'
                                : 'border-accent-primary/30 shadow-accent-primary/5';

                        return (
                            <motion.div
                                id={`issue-card-${i}`}
                                key={i}
                                initial={false}
                                animate={{
                                    scale: isHighlighted ? 1.02 : 1,
                                    y: isHighlighted ? -2 : 0,
                                }}
                                transition={{ duration: 0.2 }}
                                onMouseEnter={() => setHoveredIssueIndex(i)}
                                onMouseLeave={() => setHoveredIssueIndex(null)}
                                className={`
                                    group flex flex-col sm:flex-row gap-4 p-4 md:p-6 
                                    bg-card border rounded-xl 
                                    transition-all duration-300
                                    ${isHighlighted
                                        ? `${severityBorderColor} shadow-lg ring-2 ring-offset-2 ring-offset-background ${item.severity === 'critical' ? 'ring-red-500/30' :
                                            item.severity === 'high' ? 'ring-orange-500/30' : 'ring-accent-primary/20'
                                        }`
                                        : 'border-border-dim hover:border-accent-primary/30 hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-primary/5'
                                    }
                                    cursor-pointer
                                `}
                                onClick={() => handleIssueClick(i)}
                            >
                                {/* Issue Number with Marker Style */}
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                    text-white text-sm font-black
                                    ${item.severity === 'critical' ? 'bg-red-500' :
                                        item.severity === 'high' ? 'bg-gradient-to-br from-orange-500 to-amber-500' :
                                            item.severity === 'medium' ? 'bg-blue-500' : 'bg-slate-500'}
                                    ${isHighlighted ? 'shadow-lg scale-110' : ''}
                                    transition-all duration-200
                                `}>
                                    {i + 1}
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-lg text-foreground">{item.title}</h4>
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${item.severity === 'critical' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                                            item.severity === 'high' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' :
                                                'bg-accent-primary text-white shadow-lg shadow-accent-primary/20'
                                            }`}>{item.severity}</span>
                                    </div>
                                    <p className="text-muted-text text-sm mb-4 leading-relaxed">{item.issue || item.critique}</p>
                                    <div className="flex gap-3 items-start bg-foreground/[0.02] p-4 rounded-lg border border-border-dim">
                                        <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-foreground/90 font-medium italic">{item.solution || item.fix}</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
