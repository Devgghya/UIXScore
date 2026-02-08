"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, CheckCircle, AlertCircle, Loader2, Download, Lock,
  ChevronDown, LogOut, Zap, LayoutDashboard, Home as HomeIcon, History as HistoryIcon,
  Plus, X, Trash2, User, Sparkles, CreditCard, ArrowRight, ArrowLeft, ExternalLink, GitCompare, Eye, Shield, Rocket, Coffee
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { UserProfileButton } from "@/components/user-profile-button";
import { PricingPlans } from "./PricingPlans";

const ReportView = dynamic(() => import("./ReportView"), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex items-center justify-center bg-card rounded-3xl border border-border-dim animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
    </div>
  )
});

// --- TYPES ---
interface AuditItem {
  title: string;
  critique: string;
  fix: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface HistoryRecord {
  id: string;
  ui_title: string;
  date: string;
  preview: string;
  analysis: any;
  framework: string;
}

import { ThemeToggle } from "@/components/theme-toggle";

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const isSignedIn = !!user;
  const searchParams = useSearchParams();

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "pricing">("dashboard");

  // --- USER DATA ---
  const [plan, setPlan] = useState<"guest" | "free" | "pro" | "design" | "enterprise">("guest");
  const [auditsUsed, setAuditsUsed] = useState(0);
  const [auditLimit, setAuditLimit] = useState<number | null>(3);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // --- AUDIT INPUTS ---
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [mode, setMode] = useState<"upload" | "url" | "crawler" | "accessibility">("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- AUDIT RESULTS ---
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [framework, setFramework] = useState("nielsen");
  const [frameworkMenuOpen, setFrameworkMenuOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const LOADING_MESSAGES = [
    "Initializing AI analysis... (Cold Start)",
    "Analyzing visual hierarchy & layout balance...",
    "Evaluating accessibility compliance (WCAG 2.1)...",
    "Checking usability heuristics against Nielsen's standards...",
    "Synthesizing strategic insights from visual data...",
    "Identifying conversion blockers & trust signals...",
    "Generating actionable improvements...",
    "Still cooking... conducting a deep-dive audit...",
    "Almost there! Polishing the final report...",
    "Just a little longer... AI is thinking hard...",
    "Reviewing visual patterns...",
    "Comparing against best practices...",
    "Finalizing score calculation..."
  ];

  const isPaid = ["pro", "design", "enterprise", "agency"].includes(plan);
  const freeAuditsLeft = auditLimit === null ? Infinity : Math.max(auditLimit - auditsUsed, 0);

  // --- INIT DATA & PARAMS ---
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "crawler") setMode("url"); // Unified Crawler
    if (modeParam === "accessibility") setMode("accessibility");

    async function fetchUsage() {
      if (!isSignedIn) {
        setPlan("guest");
        setAuditsUsed(0);
        setAuditLimit(2);

        return;
      }

      try {
        const res = await fetch("/api/usage");
        const data = await res.json();
        setPlan(data.plan || "guest");
        setAuditsUsed(typeof data.audits_used === "number" ? data.audits_used : 0);
        setAuditLimit(data.limit === null || data.limit === undefined ? null : data.limit);

        setPlanExpiresAt(data.plan_expires_at || null);
        setSubscriptionId(data.subscription_id || null);
      } catch (err) {
        console.error("Failed to load usage", err);
      }
    }

    async function fetchCloudHistory() {
      if (!isSignedIn) return;
      try {
        const res = await fetch("/api/history");
        const data = await res.json();

        if (data.history) {
          const formattedHistory: HistoryRecord[] = data.history.map((record: any) => ({
            id: record.id.toString(),
            ui_title: record.ui_title || "Untitled Scan",
            date: new Date(record.created_at).toLocaleDateString(),
            preview: record.image_url,
            analysis: record.analysis,
            framework: record.framework
          }));
          setHistory(formattedHistory);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    }

    Promise.all([fetchUsage(), fetchCloudHistory()]);
    Promise.all([fetchUsage(), fetchCloudHistory()]);
  }, [isSignedIn, user, searchParams]);


  // PAYPAL RETURN HANDLER
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const token = searchParams.get("token"); // PayPal Order ID
    const payerId = searchParams.get("PayerID");

    if (paymentStatus === "success" && token && payerId) {
      // 1. Show verifying UI
      setLoading(true);
      setLoadingMessage("Verifying PayPal Payment...");

      // 2. Call Verify API
      const verifyPayment = async () => {
        try {
          const res = await fetch("/api/payment/verify-paypal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: token }),
          });

          const data = await res.json();

          if (data.success || data.plan) {
            alert("Payment Verified! Your plan has been upgraded.");
            window.location.href = "/dashboard"; // Clear query params & refresh state
          } else {
            alert(data.error || "Verification failed. Please contact support.");
            setLoading(false);
          }
        } catch (err) {
          console.error(err);
          alert("Error verifying payment.");
          setLoading(false);
        }
      };

      verifyPayment();
    } else if (paymentStatus === "cancelled") {
      alert("Payment was cancelled.");
      // Ideally remove query param
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [searchParams]);


  const handleUpgrade = (planId: string) => {
    // Ideally fetch fresh usage from server, but for speed we optimistic update
    setPlan(planId as any);

    let newAuditLimit: number | null = 3;
    let newTokenLimit = 2000;

    if (planId === "pro") {
      newAuditLimit = 60;

    } else if (planId === "design") {
      newAuditLimit = null; // Unlimited

    }

    setAuditLimit(newAuditLimit);

    setAuditsUsed(0);
    setActiveTab("dashboard");
    alert(`${planId.charAt(0).toUpperCase() + planId.slice(1)} plan activated!`);
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this audit? This action cannot be undone.")) {
      return;
    }

    // Optimistic UI update
    const originalHistory = [...history];
    setHistory(history.filter(h => h.id !== id));

    // Clear selection if it was selected
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);

    try {
      const res = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err) {
      console.error(err);
      alert("Error deleting item. Please try again.");
      setHistory(originalHistory); // Rollback
    }
  };

  const deleteSelectedAudits = async () => {
    if (selectedIds.size === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected audits? This action cannot be undone.`)) {
      return;
    }

    const idsToDelete = Array.from(selectedIds);
    const originalHistory = [...history];

    // Optimistic UI update
    setHistory(history.filter(h => !selectedIds.has(h.id)));
    setSelectedIds(new Set());

    try {
      const res = await fetch(`/api/history?id=${idsToDelete.join(",")}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete selected");
      alert(`${idsToDelete.length} audits deleted successfully.`);
    } catch (err) {
      console.error(err);
      alert("Error deleting audits. Please try again.");
      setHistory(originalHistory); // Rollback
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(h => h.id)));
    }
  };

  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // --- PASTE LISTENER ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter((item) => item.type.startsWith("image/"));
        if (imageItems.length > 0) {
          const newFiles: File[] = [];
          const newPreviews: string[] = [];
          imageItems.forEach((item) => {
            const file = item.getAsFile();
            if (file) {
              newFiles.push(file);
              newPreviews.push(URL.createObjectURL(file));
            }
          });
          setFiles((prev) => [...prev, ...newFiles]);
          setPreviews((prev) => [...prev, ...newPreviews]);
          setMode("upload");
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);


  // --- MAIN AUDIT FUNCTION WITH RETRY LOGIC ---
  async function handleAudit() {
    if (mode === "upload" && files.length === 0) return;
    if ((mode === "url" || mode === "crawler" || mode === "accessibility") && !urlInput) return;

    const reachedLimit = plan !== "pro" && auditLimit !== null && auditsUsed >= auditLimit;
    if (reachedLimit) {
      setActiveTab("pricing");
      return;
    }

    setLoading(true);
    setLoadingMessage("Starting analysis...");
    setAnalysisData(null);

    const formData = new FormData();
    formData.append("framework", framework);

    // UNIFIED: If user selected "url", send "crawler" to API for deep scan
    if (mode === "url") {
      formData.append("mode", "crawler");
      formData.append("url", urlInput);
    } else {
      formData.append("mode", mode);
      if (mode === "accessibility") formData.append("url", urlInput);
      else files.forEach((file) => formData.append("file", file));
    }

    // Retry logic with unlimited retries (cap at 60 for sanity ~5 mins)
    const MAX_RETRIES = 60;
    const RETRY_DELAY = 5000; // 5s consistent loop

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Update loading message
        setLoadingMessage(LOADING_MESSAGES[attempt % LOADING_MESSAGES.length]);

        // Wait before retry (except first attempt)
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        const res = await fetch("/api/audit", { method: "POST", body: formData });

        if (res.status === 402) {
          setActiveTab("pricing");
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          // Retry on server errors (500, 503, 504) or timeouts
          if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
            console.log(`Attempt ${attempt + 1} failed (${res.status}), retrying...`);
            continue; // Retry silently
          }
          throw new Error(data.error || "Request failed");
        }

        // Success - process the response
        if (data.audit || data.score !== undefined) {
          setAnalysisData(data); // STORE FULL DATA

          // Update Local Limits
          if (data.limits) {
            setPlan(data.limits.plan || "guest");
            if (typeof data.limits.audits_used === "number") setAuditsUsed(data.limits.audits_used);
            setAuditLimit(data.limits.limit === null || data.limits.limit === undefined ? null : data.limits.limit);

          } else if (isSignedIn) {
            setAuditsUsed((prev) => prev + 1);
          }

          if (isSignedIn) {
            const newRecord: HistoryRecord = {
              id: data.id || Date.now().toString(),
              ui_title: data.ui_title,
              date: new Date().toLocaleDateString(),
              preview: data.image_url,
              analysis: data, // Store full object
              framework: framework
            };
            setHistory([newRecord, ...history]);
          }

          setLoading(false);
          return; // Success - exit function
        } else if (data.error) {
          alert(data.error);
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error(`Attempt ${attempt + 1} error:`, error);

        // If this is the last attempt, show error to user
        if (attempt === MAX_RETRIES - 1) {
          alert(`Error analyzing: ${error.message || "Unknown error"}. Please try again later.`);
          setLoading(false);
          return;
        }
        // Otherwise, continue to next retry silently
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
      }
    }

    setLoading(false);
  }

  // --- PDF ENGINE (HYBRID) ---
  const handleExportPDF = async (overrideData?: any) => {
    const dataToUse = overrideData || analysisData;
    if (!dataToUse) return;

    setPdfGenerating(true);
    try {
      // Dynamic imports
      const jsPDF = (await import("jspdf")).default;
      const { toPng } = await import("html-to-image"); // Re-import for chart capture

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // COLORS (Forced Light Mode)
      const BG = { r: 255, g: 255, b: 255 };
      const CARD = { r: 248, g: 250, b: 252 };
      const STROKE = { r: 226, g: 232, b: 240 };
      const TEXT_MAIN = { r: 2, g: 6, b: 23 };
      const TEXT_MUTED = { r: 100, g: 116, b: 139 };
      const ACCENT = { r: 79, g: 70, b: 229 }; // Indigo-600

      // HELPER: Draw rounded rect
      const roundedRect = (x: number, y: number, w: number, h: number, r: number = 3) => {
        doc.roundedRect(x, y, w, h, r, r, "F");
        doc.setDrawColor(STROKE.r, STROKE.g, STROKE.b);
        doc.setLineWidth(0.1);
        doc.roundedRect(x, y, w, h, r, r, "S");
      };

      // --- PAGE 1: DASHBOARD ---

      // Background
      doc.setFillColor(BG.r, BG.g, BG.b);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Header
      // Logo
      try {
        const logoUrl = window.location.origin + "/uixscore-logo.png";
        const logoImg = new Image();
        logoImg.src = logoUrl;
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        });
        doc.addImage(logoImg, "PNG", 15, 15, 12, 12);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
        doc.text("UIXScore", 32, 24);
      } catch (e) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
        doc.text("UIXScore", 15, 24);
      }

      // Title
      doc.setFontSize(16);
      doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
      doc.text(dataToUse.ui_title || "Ui UX Audit Report", 15, 50);

      doc.setFontSize(10);
      doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
      doc.text(`Framework: ${framework === 'nielsen' ? "Nielsen's Heuristics" : "Custom"}`, 15, 58);

      let headerY = 63;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, headerY);

      if (dataToUse.target_url) {
        headerY += 5;
        doc.setTextColor(79, 70, 229); // Accent color
        doc.text(`Site: ${dataToUse.target_url}`, 15, headerY);
      }

      // ... (Rest of the PDF generation)

      // Score Card (Top Right) - Overall/Average Score
      const score = Math.round(dataToUse.score || 0);
      const scoreColor = score >= 80 ? [16, 185, 129] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
      const imagesForScore = dataToUse.images || [];
      const isMultiImage = imagesForScore.length > 1;

      doc.setFillColor(CARD.r, CARD.g, CARD.b);
      doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(pageWidth - 55, 15, 40, 30, 3, 3, "FD");

      doc.setFontSize(8);
      doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
      doc.text(isMultiImage ? "AVG UX SCORE" : "UX SCORE", pageWidth - 35, 22, { align: "center" });

      doc.setFontSize(24);
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(score.toString(), pageWidth - 35, 33, { align: "center" });

      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("OUT OF 100", pageWidth - 35, 39, { align: "center" });

      // Per-Image Score Cards (if multiple images)
      if (isMultiImage) {
        let scoreCardY = 48;
        doc.setFontSize(8);
        doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
        doc.text("Individual Scores:", pageWidth - 55, scoreCardY);
        scoreCardY += 5;

        imagesForScore.slice(0, 4).forEach((img: any, idx: number) => {
          const imgMetrics = img.ux_metrics || {};
          const metricValues = Object.values(imgMetrics) as number[];
          const imgAvg = metricValues.length > 0
            ? Math.round(metricValues.reduce((a, b) => a + b, 0) / metricValues.length * 10)
            : 70;
          const imgColor = imgAvg >= 80 ? [16, 185, 129] : imgAvg >= 60 ? [245, 158, 11] : [239, 68, 68];

          doc.setFontSize(7);
          doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
          doc.text(`#${idx + 1}:`, pageWidth - 55, scoreCardY);
          doc.setTextColor(imgColor[0], imgColor[1], imgColor[2]);
          doc.setFont("helvetica", "bold");
          doc.text(`${imgAvg}`, pageWidth - 45, scoreCardY);
          doc.setFont("helvetica", "normal");
          scoreCardY += 4;
        });
      }


      // --- HYBRID CONTENT: RADAR CHART ---
      // We assume the chart exists in the DOM. We capture it as an image.
      const chartEl = document.getElementById("radar-chart-container");
      if (chartEl) {
        try {
          // Wait a bit for render
          await new Promise(r => setTimeout(r, 200));
          const chartDataUrl = await toPng(chartEl, {
            backgroundColor: '#ffffff',
            style: {
              color: '#1e293b', // Force dark text (Slate 800) for PDF
            }
          });

          // Draw Chart Card Background (extended to fit metrics)
          doc.setFillColor(CARD.r, CARD.g, CARD.b);
          roundedRect(15, 80, 90, 80);

          // Title
          doc.setFontSize(12);
          doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
          doc.text("Performance Metrics", 20, 90);

          // Embed Chart Image (smaller to make room for metrics)
          doc.addImage(chartDataUrl, 'PNG', 18, 93, 50, 40);

          // Add metric values as a table next to the chart
          const metrics = dataToUse.ux_metrics || {};
          const metricLabels = ['clarity', 'efficiency', 'consistency', 'aesthetics', 'accessibility'];
          let metricY = 98;

          doc.setFontSize(8);
          doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
          doc.text("Score", 93, 93, { align: "right" });

          metricLabels.forEach((key) => {
            const val = metrics[key] || 0;
            const displayVal = Math.round(val * 10); // Convert 0-10 to 0-100
            const valColor = displayVal >= 70 ? [16, 185, 129] : displayVal >= 50 ? [245, 158, 11] : [239, 68, 68];

            // Label
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
            doc.text(key.charAt(0).toUpperCase() + key.slice(1), 70, metricY);

            // Value (with color)
            doc.setFont("helvetica", "bold");
            doc.setTextColor(valColor[0], valColor[1], valColor[2]);
            doc.text(`${displayVal}`, 93, metricY, { align: "right" });

            metricY += 7;
          });

        } catch (e) {
          console.error("Chart capture failed", e);
          // Fallback text
          doc.setTextColor(220, 38, 38);
          doc.text("Chart unavailable", 20, 90);
        }
      }

      // --- STRENGTHS & WEAKNESSES (Right Side) ---
      const rightColX = 115;

      // Strengths Card
      doc.setFillColor(CARD.r, CARD.g, CARD.b);
      roundedRect(rightColX, 80, 80, 38); // Moved from 60 to 80

      doc.setFontSize(12);
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text("Key Strengths", rightColX + 5, 90); // Moved from 70 to 90

      doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
      doc.setFontSize(9);
      let sY = 98; // Moved from 78 to 98
      (dataToUse.key_strengths || []).slice(0, 3).forEach((s: string) => {
        doc.text(`• ${s.substring(0, 45)}${s.length > 45 ? '...' : ''}`, rightColX + 5, sY);
        sY += 6;
      });

      // Weaknesses Card
      doc.setFillColor(CARD.r, CARD.g, CARD.b);
      roundedRect(rightColX, 122, 80, 38); // Moved from 102 to 122

      doc.setFontSize(12);
      doc.setTextColor(239, 68, 68); // Red
      doc.text("Areas for Improvement", rightColX + 5, 132); // Moved from 112 to 132

      doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
      doc.setFontSize(9);
      let wY = 140; // Moved from 120 to 140
      (dataToUse.key_weaknesses || []).slice(0, 3).forEach((w: string) => {
        doc.text(`• ${w.substring(0, 45)}${w.length > 45 ? '...' : ''}`, rightColX + 5, wY);
        wY += 6;
      });


      // --- DETAILED FINDINGS (Cards List) ---
      doc.setFontSize(14);
      doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
      doc.text("Detailed Findings", 15, 175); // Moved from 155 to 175

      let cursorY = 185; // Moved from 165 to 185

      // Check if we have per-image data
      const imagesData = dataToUse.images || [];
      const hasMultipleImages = imagesData.length > 1;

      if (hasMultipleImages) {
        // Multi-image report: iterate through each image
        imagesData.forEach((imgData: any, imgIdx: number) => {
          // Check page break before image section header
          if (cursorY > pageHeight - 60) {
            doc.addPage();
            doc.setFillColor(BG.r, BG.g, BG.b);
            doc.rect(0, 0, pageWidth, pageHeight, "F");
            cursorY = 20;
          }

          // Image Section Header
          doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
          doc.roundedRect(15, cursorY, pageWidth - 30, 10, 2, 2, "F");
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.text(`Screenshot ${imgIdx + 1}: ${imgData.ui_title || 'Analysis'}`, 20, cursorY + 7);

          // Show per-image score if available
          const imgMetrics = imgData.ux_metrics || {};
          const avgScore = Object.values(imgMetrics).reduce((a: any, b: any) => a + b, 0) as number / Math.max(Object.keys(imgMetrics).length, 1);
          if (avgScore > 0) {
            doc.setFontSize(9);
            doc.text(`Avg: ${Math.round(avgScore * 10)}/100`, pageWidth - 35, cursorY + 7);
          }

          cursorY += 15;

          // Render findings for this image
          (imgData.audit || []).forEach((item: any, idx: number) => {
            // 1. Calculate Text Dimensions
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            const titleLines = doc.splitTextToSize(item.title || "Issue", pageWidth - 70);
            const titleHeight = titleLines.length * 5;

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(item.issue || "No description", pageWidth - 50);
            const descHeight = descLines.length * 4;

            const solLines = doc.splitTextToSize(item.solution || "No suggestion", pageWidth - 70);
            const solHeight = solLines.length * 4;

            // Padding & Spacing
            const cardHeight = 10 + titleHeight + 8 + descHeight + 10 + solHeight + 10;

            // 2. Check Page Break
            if (cursorY + cardHeight > pageHeight - 20) {
              doc.addPage();
              doc.setFillColor(BG.r, BG.g, BG.b);
              doc.rect(0, 0, pageWidth, pageHeight, "F");
              cursorY = 20;
            }

            // 3. Card Background
            doc.setFillColor(CARD.r, CARD.g, CARD.b);
            roundedRect(15, cursorY, pageWidth - 30, cardHeight);

            // 4. Content
            let contentY = cursorY + 10;

            // Number
            doc.setFontSize(10);
            doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
            doc.text(`#${idx + 1}`, 20, contentY);

            // Title
            doc.setFontSize(11);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.setFont("helvetica", "bold");
            doc.text(titleLines, 30, contentY);

            // Severity Pill
            const sev = (item.severity || "LOW").toUpperCase();
            const sevColor = sev === "CRITICAL" ? [239, 68, 68] : sev === "HIGH" ? [245, 158, 11] : [59, 130, 246];
            doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
            doc.roundedRect(pageWidth - 35, cursorY + 5, 15, 5, 1, 1, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6);
            doc.text(sev, pageWidth - 27.5, cursorY + 8.5, { align: "center" });

            contentY += titleHeight + 8;

            // Description
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
            doc.text(descLines, 30, contentY);

            contentY += descHeight + 10;

            // Recommendation
            doc.setTextColor(202, 138, 4);
            doc.text("Suggestion:", 30, contentY);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.text(solLines, 52, contentY);

            cursorY += cardHeight + 5;
          });

          cursorY += 10; // Extra spacing between images
        });
      } else {
        // Single image or legacy: use combined audit array
        (dataToUse.audit || []).forEach((item: any, idx: number) => {
          // 1. Calculate Text Dimensions
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          const titleLines = doc.splitTextToSize(item.title || "Issue", pageWidth - 70);
          const titleHeight = titleLines.length * 5;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(item.issue || "No description", pageWidth - 50);
          const descHeight = descLines.length * 4;

          const solLines = doc.splitTextToSize(item.solution || "No suggestion", pageWidth - 70);
          const solHeight = solLines.length * 4;

          // Padding & Spacing
          const cardHeight = 10 + titleHeight + 8 + descHeight + 10 + solHeight + 10;

          // 2. Check Page Break
          if (cursorY + cardHeight > pageHeight - 20) {
            doc.addPage();
            doc.setFillColor(BG.r, BG.g, BG.b);
            doc.rect(0, 0, pageWidth, pageHeight, "F");
            cursorY = 20;
          }

          // 3. Card Background
          doc.setFillColor(CARD.r, CARD.g, CARD.b);
          roundedRect(15, cursorY, pageWidth - 30, cardHeight);

          // 4. Content
          let contentY = cursorY + 10;

          // Number
          doc.setFontSize(10);
          doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
          doc.text(`#${idx + 1}`, 20, contentY);

          // Title
          doc.setFontSize(11);
          doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
          doc.setFont("helvetica", "bold");
          doc.text(titleLines, 30, contentY);

          // Severity Pill
          const sev = (item.severity || "LOW").toUpperCase();
          const sevColor = sev === "CRITICAL" ? [239, 68, 68] : sev === "HIGH" ? [245, 158, 11] : [59, 130, 246];
          doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
          doc.roundedRect(pageWidth - 35, cursorY + 5, 15, 5, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.text(sev, pageWidth - 27.5, cursorY + 8.5, { align: "center" });

          contentY += titleHeight + 8;

          // Description
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
          doc.text(descLines, 30, contentY);

          contentY += descHeight + 10;

          // Recommendation
          doc.setTextColor(202, 138, 4);
          doc.text("Suggestion:", 30, contentY);
          doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
          doc.text(solLines, 52, contentY);

          cursorY += cardHeight + 5;
        });
      }

      // --- ANNOTATED SCREENSHOTS (All images) ---
      const allImageUrls = previews.length ? previews : (dataToUse.image_url ? [dataToUse.image_url] : []);
      const perImageData = dataToUse.images || [];

      if (allImageUrls.length > 0) {
        for (let imgIdx = 0; imgIdx < allImageUrls.length; imgIdx++) {
          try {
            doc.addPage();
            doc.setFillColor(BG.r, BG.g, BG.b);
            doc.rect(0, 0, pageWidth, pageHeight, "F");

            // Title with screenshot number
            doc.setFontSize(16);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.setFont("helvetica", "bold");
            const imgTitle = perImageData[imgIdx]?.ui_title || `Screenshot ${imgIdx + 1}`;
            doc.text(`Visual Analysis: ${imgTitle}`, 15, 20);

            // Subtitle showing which screenshot
            doc.setFontSize(10);
            doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
            doc.text(`Screenshot ${imgIdx + 1} of ${allImageUrls.length}`, 15, 28);

            // Load and embed the image
            const imageUrl = allImageUrls[imgIdx];
            if (imageUrl) {
              // Create image element and load
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = imageUrl;

              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Image load failed'));
                setTimeout(() => resolve(), 3000); // Timeout fallback
              });

              // Calculate dimensions
              const maxWidth = pageWidth - 30;
              const maxHeight = pageHeight - 50;
              let imgWidth = img.width;
              let imgHeight = img.height;

              // Scale to fit
              if (imgWidth > maxWidth) {
                const scale = maxWidth / imgWidth;
                imgWidth = maxWidth;
                imgHeight = imgHeight * scale;
              }
              if (imgHeight > maxHeight) {
                const scale = maxHeight / imgHeight;
                imgHeight = maxHeight;
                imgWidth = imgWidth * scale;
              }

              doc.addImage(img, 'PNG', 15, 35, imgWidth, imgHeight);

              // Show findings count for this image
              const imgFindings = perImageData[imgIdx]?.audit?.length || 0;
              if (imgFindings > 0) {
                doc.setFontSize(9);
                doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
                doc.text(`${imgFindings} finding(s) identified`, pageWidth - 15, 28, { align: "right" });
              }
            }
          } catch (e) {
            console.error(`Screenshot ${imgIdx + 1} capture for PDF failed`, e);
          }
        }
      } else {
        // Fallback: try to capture the DOM element if no image URLs available
        const screenshotEl = document.getElementById("annotated-screenshot-section");
        if (screenshotEl) {
          try {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(TEXT_MAIN.r, TEXT_MAIN.g, TEXT_MAIN.b);
            doc.setFont("helvetica", "bold");
            doc.text("Visual Analysis", 15, 20);

            const sidePanel = screenshotEl.querySelector('[data-pdf-hide="true"]');
            if (sidePanel) {
              (sidePanel as HTMLElement).style.display = 'none';
            }

            await new Promise(r => setTimeout(r, 500));

            const shotDataUrl = await toPng(screenshotEl, {
              backgroundColor: '#ffffff',
              quality: 0.95,
              pixelRatio: 2
            });

            if (sidePanel) {
              (sidePanel as HTMLElement).style.display = '';
            }

            const imgProps = doc.getImageProperties(shotDataUrl);
            const pdfWidth = pageWidth - 30;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let renderHeight = pdfHeight;
            if (renderHeight > pageHeight - 40) {
              renderHeight = pageHeight - 40;
            }

            doc.addImage(shotDataUrl, 'PNG', 15, 30, pdfWidth, renderHeight);
          } catch (e) {
            console.error("Screenshot capture for PDF failed", e);
          }
        }
      }

      // Branding Footer (Only if not Enterprise)
      if (plan !== 'enterprise') {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("Generative AI Audit by UIXScore", pageWidth - 15, pageHeight - 5, { align: "right" });
        }
      }

      // Filename construction
      const getSafeHostname = (urlStr: string) => {
        if (!urlStr) return "Site";
        try {
          const hasProtocol = /^[a-z]+:\/\//i.test(urlStr);
          const fullUrl = hasProtocol ? urlStr : `https://${urlStr}`;
          return new URL(fullUrl).hostname.replace('www.', '').split('.')[0];
        } catch (e) {
          return "Site";
        }
      };

      const siteName = getSafeHostname(dataToUse.target_url);
      const cleanTitle = (dataToUse.ui_title || siteName).replace(/[^a-zA-Z0-9 ]/g, "").trim();
      const filename = `${cleanTitle} UIXScore Audit - UIXScore.pdf`;

      doc.save(filename);

    } catch (err: any) {
      console.error("PDF Fail:", err);
      alert("Failed to generate PDF. check console.");
    } finally {
      setPdfGenerating(false);
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
      setPreviews((prev) => [...prev, ...selectedFiles.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };


  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-500">

      {/* IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-8 backdrop-blur-sm cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImage}
              className="max-w-full max-h-full rounded-lg shadow-2xl border border-border-dim"
            />
            <button className="absolute top-6 right-6 text-foreground/50 hover:text-foreground transition-colors">
              <X className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-lg border-t border-border-dim px-2 py-3 flex justify-around items-center md:hidden">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 transition-all text-muted-text hover:text-foreground"
        >
          <HomeIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-muted-text'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Audit</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-accent-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-muted-text'}`}
        >
          <HistoryIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'pricing' ? 'text-accent-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-muted-text'}`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Pricing</span>
        </button>
        <Link
          href="/account"
          className="flex flex-col items-center gap-1 transition-all text-muted-text hover:text-foreground"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">Account</span>
        </Link>
      </nav>

      {/* SIDEBAR (Desktop only) */}
      <aside className="fixed left-0 top-0 h-screen w-72 border-r border-border-dim bg-card hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <img src="/uixscore-logo.png" alt="UIXScore" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-xl font-bold text-foreground tracking-tight">UIXScore<span className="text-indigo-500 dark:text-indigo-400"></span></span>
            </div>
            <ThemeToggle />
          </div>
          <nav className="space-y-2">
            <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-muted-text hover:text-foreground hover:bg-foreground/5">
              <HomeIcon className="w-5 h-5" /> Home
            </Link>
            <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-muted-text hover:text-foreground hover:bg-foreground/5'}`}>
              <LayoutDashboard className="w-5 h-5" /> New Audit
            </button>
            <Link href="/compare" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-muted-text hover:text-foreground hover:bg-foreground/5">
              <GitCompare className="w-5 h-5" /> Competitor Compare
            </Link>
            <button onClick={() => setActiveTab("history")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'history' ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-muted-text hover:text-foreground hover:bg-foreground/5'}`}>
              <HistoryIcon className="w-5 h-5" /> History
            </button>
            <button onClick={() => setActiveTab("pricing")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'pricing' ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-muted-text hover:text-foreground hover:bg-foreground/5'}`}>
              <CreditCard className="w-5 h-5" /> Pricing
            </button>
            {user?.isAdmin && (
              <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-muted-text hover:text-red-400 hover:bg-red-500/10 mt-6 border border-transparent hover:border-red-500/20">
                <Shield className="w-5 h-5" /> Admin Console
              </Link>
            )}
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-border-dim">
          {!isSignedIn ? (
            <div className="bg-foreground/[0.03] p-4 rounded-xl border border-border-dim text-center">
              <p className="text-xs text-muted-text mb-3">Sign in to save history</p>
              <Link href="/login" className="block w-full py-2 bg-accent-primary hover:opacity-90 rounded-lg text-white font-bold text-xs shadow-md shadow-accent-primary/20 text-center">
                Sign In
              </Link>
            </div>
          ) : (
            <>
              {auditLimit !== null && (
                <div className="mb-4 px-2">
                  <div className="flex justify-between text-[10px] font-bold text-muted-text mb-1.5 uppercase tracking-wider">
                    <span>Audits Left</span>
                    <span>{freeAuditsLeft} / {auditLimit}</span>
                  </div>
                  <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${auditsUsed >= auditLimit ? 'bg-red-500' : 'bg-accent-primary'}`}
                      style={{ width: `${Math.min((auditsUsed / auditLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <UserProfileButton direction="up" />
            </>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative md:ml-72 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12">

          {/* --- TAB 1: NEW AUDIT --- */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 mb-8 md:mb-12">
                <div className="flex-1">
                  <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">{isSignedIn ? `Welcome back, ${user.firstName}` : "Design Audit Dashboard"}</h1>
                  <p className="text-muted-text text-xs md:text-sm mb-3">Upload your UI to get expert feedback instantly.</p>

                  {/* Current Plan Badge */}
                  {isSignedIn && (
                    <div className={`inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-bold transition-all ${plan === 'enterprise' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' :
                      plan === 'design' ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' :
                        plan === 'pro' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' :
                          plan === 'free' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                            'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400'
                      }`}>
                      {plan === 'enterprise' ? <Rocket className="w-3 h-3 md:w-4 md:h-4" /> :
                        plan === 'design' ? <Sparkles className="w-3 h-3 md:w-4 md:h-4" /> :
                          plan === 'pro' ? <Zap className="w-3 h-3 md:w-4 md:h-4" /> :
                            plan === 'free' ? <Coffee className="w-3 h-3 md:w-4 md:h-4" /> :
                              <User className="w-3 h-3 md:w-4 md:h-4" />
                      }
                      <span>Current Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                    </div>
                  )}
                </div>
                {!isPaid && isSignedIn && (
                  <button onClick={() => setActiveTab("pricing")} className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs rounded-full shadow-lg shadow-orange-500/20 hover:scale-110 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300"><Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" /> Upgrade to Pro</button>
                )}
              </div>

              {/* TOOL BOX */}
              <div className="bg-card border border-border-dim rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl relative mb-8 md:mb-12 hover:border-accent-primary/20 transition-all duration-300">

                <div className="flex justify-center mb-6 md:mb-8">
                  <div className="bg-foreground/5 p-1 md:p-1.5 rounded-xl flex gap-1 border border-border-dim w-full md:w-auto">
                    <button onClick={() => setMode("upload")} className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${mode === 'upload' ? 'bg-background text-foreground shadow-md scale-105' : 'text-muted-text hover:text-foreground hover:bg-foreground/5'}`}>Upload Images</button>
                    <button onClick={() => setMode("url")} className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 ${mode === 'url' ? 'bg-background text-foreground shadow-md scale-105' : 'text-muted-text hover:text-foreground hover:bg-foreground/5'}`}>Site Crawler</button>
                  </div>
                </div>

                {mode === "accessibility" && (
                  <div className="flex justify-center -mt-6 mb-8">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
                      <Eye className="w-3 h-3" /> Accessibility Mode Active
                    </span>
                  </div>
                )}

                <div className="min-h-[200px] flex flex-col justify-center">
                  {mode === "upload" ? (
                    previews.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {previews.map((src, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={src}
                              onClick={() => setSelectedImage(src)}
                              className="rounded-xl border border-border-dim w-full h-32 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                            />
                            <button
                              onClick={() => removeImage(i)}
                              className="absolute top-2 right-2 bg-foreground/60 hover:bg-red-500 text-background p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm transform hover:scale-110"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <label className="border border-dashed border-border-dim rounded-xl flex items-center justify-center cursor-pointer hover:bg-foreground/5 min-h-[128px] transition-colors">
                          <Plus className="w-6 h-6 text-muted-text" />
                          <input type="file" multiple onChange={handleFileChange} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-border-dim bg-background rounded-2xl h-48 flex flex-col items-center justify-center hover:bg-foreground/5 hover:border-accent-primary/50 transition-all cursor-pointer group">
                        <Upload className="w-8 h-8 text-accent-primary mb-4 group-hover:scale-110 transition-transform" />
                        <p className="text-foreground font-bold text-lg">Click to Upload</p>
                        <p className="text-muted-text text-sm mt-1">or Paste from Clipboard (Ctrl+V)</p>
                        <input type="file" multiple onChange={handleFileChange} className="hidden" />
                      </label>
                    )
                  ) : (
                    <div className="w-full">
                      <input type="text" placeholder={mode === "crawler" ? "https://example.com (Scans 3 pages)" : (mode === "accessibility" ? "https://example.com (Accessibility Scan)" : "https://example.com")} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="w-full bg-background border border-border-dim rounded-xl px-5 py-4 text-foreground focus:border-accent-primary focus:outline-none transition-colors" />
                      {mode === "crawler" && <p className="text-xs text-muted-text mt-3 text-center">Crawler will analyze home, about, pricing, and other key pages automatically.</p>}
                      {mode === "accessibility" && <p className="text-xs text-muted-text mt-3 text-center">Simulates Low-Vision, Screen Reader, and Motor Impairment experiences.</p>}
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-border-dim flex flex-col md:flex-row gap-4 items-stretch">
                  <div className="relative w-full md:flex-1 md:min-w-[300px]">
                    <button
                      onClick={() => !isPaid ? alert("Upgrade to Pro to unlock WCAG and Gestalt frameworks!") : setFrameworkMenuOpen(!frameworkMenuOpen)}
                      className="w-full bg-background border border-border-dim rounded-xl px-4 py-3 text-sm text-foreground flex justify-between items-center hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/50 relative group"
                    >
                      <span className="truncate mr-2 font-medium">
                        {framework === "nielsen" && "Nielsen's Heuristics"}
                        {framework === "wcag" && "WCAG 2.1 (Accessibility)"}
                        {framework === "gestalt" && "Gestalt Principles"}
                      </span>
                      {!isPaid && <Lock className="w-3 h-3 text-amber-500 ml-2" />}
                      <ChevronDown className={`w-4 h-4 text-muted-text transition-transform ${frameworkMenuOpen ? "rotate-180" : ""}`} />

                      {/* Tooltip for User Guidance */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        Select an audit framework
                      </div>
                    </button>

                    <AnimatePresence>
                      {frameworkMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full mb-2 left-0 w-full bg-card border border-border-dim rounded-xl shadow-2xl overflow-hidden z-50 ring-1 ring-black/5"
                        >
                          {[
                            { val: "nielsen", label: "Nielsen's Heuristics" },
                            { val: "wcag", label: "WCAG 2.1 (Accessibility)" },
                            { val: "gestalt", label: "Gestalt Principles" }
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              onClick={() => {
                                setFramework(opt.val);
                                setFrameworkMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 ${framework === opt.val ? "bg-accent-primary/10 text-accent-primary font-medium" : "text-foreground hover:bg-foreground/5"}`}
                            >
                              {framework === opt.val && <CheckCircle className="w-4 h-4 text-accent-primary" />}
                              <span className={framework !== opt.val ? "pl-6" : ""}>{opt.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={handleAudit} disabled={loading} className="group w-full md:w-auto md:min-w-[200px] md:px-10 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-700/20 hover:shadow-xl hover:shadow-indigo-600/40 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 py-4 md:py-3 cursor-pointer">
                    {loading ? <div className="flex items-center gap-2"><Loader2 className="animate-spin w-5 h-5" /><span className="text-xs md:text-sm">{loadingMessage || "Analyzing..."}</span></div> : <><span>Run Deep Audit</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" /></>}
                  </button>
                </div>
              </div>

              {/* REPORT DISPLAY - NEW COMPONENT */}
              <AnimatePresence>
                {analysisData && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                    {/* ACTION BAR */}
                    <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border-dim shadow-sm">
                      <div className="text-sm text-muted-text">
                        <strong>{analysisData.audit?.length || 0}</strong> Issues Found
                      </div>
                      {isSignedIn && (
                        <button
                          onClick={plan === 'free' ? () => setActiveTab("pricing") : () => handleExportPDF(analysisData)}
                          disabled={pdfGenerating}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-colors ${plan === 'free' ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                        >
                          {pdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : plan === 'free' ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          {plan === 'free' ? "Unlock PDF Report" : "Export PDF Report"}
                        </button>
                      )}
                    </div>

                    {/* NEW VISUAL REPORT */}
                    <ReportView data={analysisData} uiTitle={analysisData.ui_title || ""} imageUrls={previews.length ? previews : (analysisData.image_url ? [analysisData.image_url] : [])} />

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* --- TAB 2: HISTORY --- */}
          {activeTab === "history" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Conditional Render: Detail View or List View */}
              {selectedHistoryItem ? (
                // --- DETAIL VIEW FOR SELECTED HISTORY ITEM ---
                <div>
                  {/* Back Button */}
                  <button
                    onClick={() => setSelectedHistoryItem(null)}
                    className="flex items-center gap-2 text-muted-text hover:text-foreground mb-6 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to History
                  </button>

                  {/* Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">{selectedHistoryItem.ui_title}</h1>
                      <p className="text-muted-text text-sm">{selectedHistoryItem.framework} • {selectedHistoryItem.date}</p>
                    </div>
                    {isSignedIn && selectedHistoryItem.analysis && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setAnalysisData(selectedHistoryItem.analysis);
                            handleExportPDF(selectedHistoryItem.analysis);
                          }}
                          disabled={pdfGenerating}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg disabled:opacity-50 transition-all"
                        >
                          {pdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          Export PDF
                        </button>
                        <button
                          onClick={(e) => {
                            deleteHistoryItem(selectedHistoryItem.id, e);
                            setSelectedHistoryItem(null); // Return to list after delete
                          }}
                          className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold text-sm transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Audit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Screenshot now integrated into ReportView as AnnotatedScreenshot */}

                  {/* Report */}
                  {selectedHistoryItem.analysis ? (
                    <ReportView data={selectedHistoryItem.analysis} uiTitle={selectedHistoryItem.ui_title || ""} imageUrl={selectedHistoryItem.preview} />
                  ) : (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                      <p className="text-slate-500">No analysis data available for this audit.</p>
                    </div>
                  )}
                </div>
              ) : (
                // --- LIST VIEW ---
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <h1 className="text-3xl font-bold text-foreground">Audit History</h1>
                      {history.length > 0 && (
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 border border-border-dim rounded-lg text-xs font-bold text-muted-text hover:text-foreground hover:bg-foreground/10 transition-all"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.size === history.length ? 'bg-accent-primary border-accent-primary' : 'border-border-dim'}`}>
                            {selectedIds.size === history.length && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          {selectedIds.size === history.length ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={deleteSelectedAudits}
                        className="group flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold text-sm transition-all duration-300 animate-in fade-in slide-in-from-right-4"
                      >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                        Delete Selected ({selectedIds.size})
                      </button>
                    )}
                  </div>
                  {history.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-border-dim rounded-3xl bg-card/50">
                      <HistoryIcon className="w-12 h-12 text-slate-600 dark:text-slate-400 mx-auto mb-4" />
                      <p className="text-muted-text">No past audits found.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {history.map((record) => (
                        <div
                          key={record.id}
                          className={`bg-card border rounded-2xl p-4 transition-all duration-300 group cursor-pointer relative overflow-hidden hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent-primary/10 ${selectedIds.has(record.id) ? 'border-accent-primary/50 bg-accent-primary/5 shadow-inner shadow-accent-primary/5' : 'border-border-dim hover:border-accent-primary/30 shadow-sm'}`}
                          onClick={() => setSelectedHistoryItem(record)}
                        >
                          {/* Selection Checkbox */}
                          <div
                            onClick={(e) => toggleSelectId(record.id, e)}
                            className={`absolute top-4 left-4 z-20 w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedIds.has(record.id) ? 'bg-accent-primary border-accent-primary opacity-100' : 'border-border-dim opacity-0 group-hover:opacity-100'}`}
                          >
                            {selectedIds.has(record.id) && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className={`flex gap-4 mb-4 relative z-10 transition-transform duration-300 ${selectedIds.has(record.id) ? 'translate-x-4' : 'group-hover:translate-x-2'}`}>
                            <div className="w-20 h-20 bg-background rounded-lg overflow-hidden border border-border-dim shrink-0">
                              {record.preview && <img src={record.preview} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h3 className="text-foreground font-bold truncate text-lg">{record.ui_title}</h3>
                                <button onClick={(e) => deleteHistoryItem(record.id, e)} className="text-muted-text hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                              </div>
                              <p className="text-xs text-muted-text mt-1">{record.framework} • {record.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* --- TAB 3: PRICING --- */}
          {activeTab === "pricing" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PricingPlans
                onUpgrade={handleUpgrade}
                planExpiresAt={planExpiresAt}
                currentPlan={plan}
                subscriptionId={subscriptionId}
                refreshUsage={() => {
                  window.location.reload();
                }}
              />
            </div>
          )}

        </div>
      </main >
    </div >
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}