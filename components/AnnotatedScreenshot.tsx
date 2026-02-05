"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Lightbulb } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface AuditIssue {
    title: string;
    issue: string;
    solution: string;
    severity: "critical" | "high" | "medium" | "low";
    category?: string;
    coordinates?: string;
}

interface AnnotatedScreenshotProps {
    imageUrl: string;
    issues: AuditIssue[];
    hoveredIssueIndex: number | null;
    selectedMarkerIndex: number | null;
    onMarkerHover: (index: number | null) => void;
    onMarkerClick: (index: number) => void;
}

const getFallbackPosition = (index: number, count: number) => {
    const zones = [
        { x: 15, y: 20 }, { x: 75, y: 15 }, { x: 50, y: 45 },
        { x: 20, y: 70 }, { x: 80, y: 65 }, { x: 45, y: 20 },
        { x: 85, y: 40 }, { x: 15, y: 45 }, { x: 55, y: 75 },
        { x: 30, y: 35 },
    ];
    if (index >= zones.length) {
        const base = zones[index % zones.length];
        return {
            x: base.x + ((index - zones.length) * 3) % 10,
            y: base.y + ((index - zones.length) * 2) % 8,
        };
    }
    return zones[index];
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'critical': return { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-500', stroke: '#ef4444' };
        case 'high': return { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-500', stroke: '#f97316' };
        case 'medium': return { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-500', stroke: '#3b82f6' };
        default: return { bg: 'bg-slate-500', border: 'border-slate-400', text: 'text-slate-500', stroke: '#64748b' };
    }
};

export default function AnnotatedScreenshot({
    imageUrl,
    issues,
    hoveredIssueIndex,
    selectedMarkerIndex,
    onMarkerHover,
    onMarkerClick,
}: AnnotatedScreenshotProps) {
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const cardPanelRef = useRef<HTMLDivElement>(null);
    const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    const activeIndex = hoveredIssueIndex !== null ? hoveredIssueIndex : selectedMarkerIndex;

    const getPosition = (issue: AuditIssue, index: number) => {
        if (issue.coordinates) {
            try {
                const [x, y] = issue.coordinates.split(',').map(s => parseFloat(s.trim()));
                if (!isNaN(x) && !isNaN(y)) {
                    return { x, y };
                }
            } catch (e) { }
        }
        return getFallbackPosition(index, issues.length);
    };

    // Calculate the SVG line from marker to card panel
    useEffect(() => {
        if (activeIndex === null || !imageContainerRef.current || !cardPanelRef.current) {
            setLineCoords(null);
            return;
        }

        const issue = issues[activeIndex];
        const pos = getPosition(issue, activeIndex);
        const containerRect = imageContainerRef.current.getBoundingClientRect();
        const panelRect = cardPanelRef.current.getBoundingClientRect();

        // Marker position (relative to container)
        const markerX = (pos.x / 100) * containerRect.width;
        const markerY = (pos.y / 100) * containerRect.height;

        // Card panel left edge, vertically centered
        const cardX = panelRect.left - containerRect.left;
        const cardY = panelRect.height / 2;

        setLineCoords({
            x1: markerX,
            y1: markerY,
            x2: containerRect.width, // Right edge of image
            y2: cardY
        });
    }, [activeIndex, issues]);

    if (!imageUrl) return null;

    return (
        <div className="rounded-2xl overflow-hidden border border-border-dim bg-card shadow-lg">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-dim bg-foreground/[0.02] flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-accent-primary" />
                    Annotated Screenshot
                    <span className="text-xs font-normal text-muted-text">
                        ({issues.length} issue{issues.length !== 1 ? 's' : ''} found)
                    </span>
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-medium">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Critical
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        High
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Medium
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        Low
                    </span>
                </div>
            </div>

            {/* Main Content: Screenshot + Side Panel */}
            <div className="flex flex-col lg:flex-row">
                {/* Screenshot with Markers */}
                <div ref={imageContainerRef} className="relative flex-1 min-w-0">
                    <img
                        src={imageUrl}
                        alt="Analyzed UI Screenshot"
                        className="w-full h-auto max-h-[500px] object-contain bg-slate-100 dark:bg-slate-900"
                    />

                    {/* SVG Layer for Connecting Line */}
                    {lineCoords && activeIndex !== null && (
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none z-20"
                            style={{ overflow: 'visible' }}
                        >
                            <motion.line
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                exit={{ pathLength: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                x1={lineCoords.x1}
                                y1={lineCoords.y1}
                                x2={lineCoords.x2}
                                y2={lineCoords.y2}
                                stroke={getSeverityColor(issues[activeIndex].severity).stroke}
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                strokeLinecap="round"
                            />
                        </svg>
                    )}

                    {/* Annotation Markers */}
                    {issues.map((issue, index) => {
                        const pos = getPosition(issue, index);
                        const isActive = hoveredIssueIndex === index || selectedMarkerIndex === index;
                        const colors = getSeverityColor(issue.severity);

                        return (
                            <motion.button
                                key={index}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: isActive ? 1.4 : 1,
                                    opacity: 1,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 20,
                                    delay: index * 0.05
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkerClick(index);
                                }}
                                onMouseEnter={() => onMarkerHover(index)}
                                onMouseLeave={() => onMarkerHover(null)}
                                className={`
                                    absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2
                                    rounded-full flex items-center justify-center
                                    text-white text-xs font-black
                                    border-2 ${colors.border} ${colors.bg}
                                    shadow-lg cursor-pointer
                                    transition-all duration-200
                                    hover:scale-125 hover:z-30
                                    ${isActive ? 'z-30 ring-4 ring-white/30' : 'z-10'}
                                `}
                                style={{
                                    left: `${pos.x}%`,
                                    top: `${pos.y}%`,
                                }}
                                title={issue.title}
                            >
                                {index + 1}
                                {issue.severity === 'critical' && (
                                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Side Panel for Issue Details */}
                <div
                    ref={cardPanelRef}
                    data-pdf-hide="true"
                    className="lg:w-80 w-full border-t lg:border-t-0 lg:border-l border-border-dim bg-foreground/[0.02] p-4 flex flex-col justify-center min-h-[200px]"
                >
                    <AnimatePresence mode="wait">
                        {activeIndex !== null && issues[activeIndex] ? (
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`
                                        px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white
                                        ${getSeverityColor(issues[activeIndex].severity).bg}
                                    `}>
                                        {issues[activeIndex].severity}
                                    </span>
                                    <span className="text-xs text-muted-text font-bold">
                                        Issue #{activeIndex + 1}
                                    </span>
                                </div>
                                <h4 className="font-bold text-foreground text-base">
                                    {issues[activeIndex].title}
                                </h4>
                                <p className="text-sm text-muted-text leading-relaxed">
                                    {issues[activeIndex].issue}
                                </p>
                                <div className="flex items-start gap-2 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-foreground/80">
                                        {issues[activeIndex].solution}
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center text-muted-text"
                            >
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">Hover or click a marker</p>
                                <p className="text-xs opacity-70">to view issue details</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Hint */}
            <div className="px-4 py-2 border-t border-border-dim bg-foreground/[0.02] text-center">
                <p className="text-[10px] text-muted-text">
                    Hover on markers to see details • Click to lock selection
                </p>
            </div>
        </div>
    );
}
