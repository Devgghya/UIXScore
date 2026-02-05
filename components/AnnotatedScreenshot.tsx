"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, Lightbulb } from "lucide-react";
import { useState } from "react";

interface AuditIssue {
    title: string;
    issue: string;
    solution: string;
    severity: "critical" | "high" | "medium" | "low";
    category?: string;
    coordinates?: string; // "x,y" format
}

interface AnnotatedScreenshotProps {
    imageUrl: string;
    issues: AuditIssue[];
    hoveredIssueIndex: number | null;
    selectedMarkerIndex: number | null;
    onMarkerHover: (index: number | null) => void;
    onMarkerClick: (index: number) => void;
}

// Fallback grid pattern for older audits or missing coordinates
const getFallbackPosition = (index: number, count: number) => {
    const zones = [
        { x: 15, y: 20 }, { x: 75, y: 15 }, { x: 50, y: 45 },
        { x: 20, y: 70 }, { x: 80, y: 65 }, { x: 45, y: 20 },
        { x: 85, y: 40 }, { x: 15, y: 45 }, { x: 55, y: 75 },
        { x: 30, y: 35 },
    ];
    // If more issues than zones, stack with offset
    if (index >= zones.length) {
        const base = zones[index % zones.length];
        return {
            x: base.x + ((index - zones.length) * 3) % 10,
            y: base.y + ((index - zones.length) * 2) % 8,
        };
    }
    return zones[index];
};

const getSeverityStyles = (severity: string, isHovered: boolean) => {
    const baseStyles = {
        critical: {
            bg: "bg-red-500",
            border: "border-red-400",
            glow: "shadow-[0_0_20px_rgba(239,68,68,0.6)]",
            hoverGlow: "shadow-[0_0_30px_rgba(239,68,68,0.8)]",
            ring: "ring-red-500/30",
            pulse: true,
        },
        high: {
            bg: "bg-gradient-to-br from-orange-500 to-amber-500",
            border: "border-orange-400",
            glow: "shadow-[0_0_15px_rgba(249,115,22,0.5)]",
            hoverGlow: "shadow-[0_0_25px_rgba(249,115,22,0.7)]",
            ring: "ring-orange-500/30",
            pulse: false,
        },
        medium: {
            bg: "bg-blue-500",
            border: "border-blue-400",
            glow: "shadow-[0_0_12px_rgba(59,130,246,0.4)]",
            hoverGlow: "shadow-[0_0_20px_rgba(59,130,246,0.6)]",
            ring: "ring-blue-500/30",
            pulse: false,
        },
        low: {
            bg: "bg-slate-500",
            border: "border-slate-400",
            glow: "shadow-none",
            hoverGlow: "shadow-[0_0_10px_rgba(100,116,139,0.4)]",
            ring: "ring-slate-500/20",
            pulse: false,
        },
    };

    const style = baseStyles[severity as keyof typeof baseStyles] || baseStyles.medium;
    return {
        ...style,
        currentGlow: isHovered ? style.hoverGlow : style.glow,
    };
};

export default function AnnotatedScreenshot({
    imageUrl,
    issues,
    hoveredIssueIndex,
    selectedMarkerIndex,
    onMarkerHover,
    onMarkerClick,
}: AnnotatedScreenshotProps) {
    // Determine which issue to show in tooltip (hover prioritizes over selection if hovering a marker, 
    // strictly speaking user asked for hover to show. 
    // Let's use hover if present, else selected.)
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

    if (!imageUrl) return null;

    return (
        <div className="relative rounded-2xl overflow-hidden border border-border-dim bg-card shadow-lg">
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
                        <span className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-amber-500" />
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

            {/* Screenshot with Markers */}
            <div className="relative">
                <img
                    src={imageUrl}
                    alt="Analyzed UI Screenshot"
                    className="w-full h-auto max-h-[500px] object-contain bg-slate-100 dark:bg-slate-900"
                />

                {/* Annotation Markers */}
                {issues.map((issue, index) => {
                    const pos = getPosition(issue, index);
                    const isSelected = selectedMarkerIndex === index;
                    const isHovered = hoveredIssueIndex === index;
                    const isActive = isSelected || isHovered;

                    const styles = getSeverityStyles(issue.severity, isActive);

                    return (
                        <motion.button
                            key={index}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: isActive ? 1.3 : 1,
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
                border-2 ${styles.border}
                ${styles.bg}
                ${styles.currentGlow}
                ${styles.pulse ? 'animate-pulse' : ''}
                ring-4 ${styles.ring}
                cursor-pointer
                transition-all duration-200
                hover:scale-125 hover:z-20
                ${isActive ? 'z-20' : 'z-10'}
              `}
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                            }}
                            title={issue.title}
                        >
                            {index + 1}

                            {/* Ripple effect for critical */}
                            {issue.severity === 'critical' && (
                                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                            )}
                        </motion.button>
                    );
                })}

                {/* Tooltip Callout for Selected Marker */}
                <AnimatePresence mode="wait">
                    {activeIndex !== null && issues[activeIndex] && (
                        <motion.div
                            key={activeIndex}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-4 left-4 right-4 z-30"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-background/95 backdrop-blur-xl border border-border-dim rounded-xl p-4 shadow-2xl">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`
                        px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white
                        ${issues[activeIndex].severity === 'critical' ? 'bg-red-500' :
                                                    issues[activeIndex].severity === 'high' ? 'bg-orange-500' :
                                                        issues[activeIndex].severity === 'medium' ? 'bg-blue-500' : 'bg-slate-500'}
                      `}>
                                                {issues[activeIndex].severity}
                                            </span>
                                            <span className="text-xs text-muted-text font-medium">
                                                #{activeIndex + 1}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-foreground text-sm mb-1 truncate">
                                            {issues[activeIndex].title}
                                        </h4>
                                        <p className="text-xs text-muted-text line-clamp-2 mb-2">
                                            {issues[activeIndex].issue}
                                        </p>
                                        <div className="flex items-start gap-2 bg-foreground/[0.03] p-2 rounded-lg">
                                            <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-foreground/80 line-clamp-2">
                                                {issues[activeIndex].solution}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMarkerClick(activeIndex); // Use toggle logic from parent
                                        }}
                                        className="p-1 rounded-lg hover:bg-foreground/10 text-muted-text hover:text-foreground transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Hint */}
            <div className="px-4 py-2 border-t border-border-dim bg-foreground/[0.02] text-center">
                <p className="text-[10px] text-muted-text">
                    Click on a marker to see issue details • Click on an issue below to highlight marker
                </p>
            </div>
        </div>
    );
}
