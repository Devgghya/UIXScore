import Groq from "groq-sdk";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { headers } from "next/headers";

// Ensure Node.js runtime for Buffer and database libraries
export const runtime = "nodejs";
export const maxDuration = 60; // Increase timeout to 60 seconds for cold starts

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

const FREE_AUDIT_LIMIT = 3;            // Free-tier logged-in user limit
const GUEST_AUDIT_LIMIT = 1;           // Guest limit
const PRO_AUDIT_LIMIT = 60;            // Pro limit
const FREE_MAX_TOKENS = 2000;          // Token cap per audit for free/guest users
const PRO_MAX_TOKENS = 4000;           // Token cap per audit for Pro users
const ULTRA_MAX_TOKENS = 8000;         // Design/Enterprise

const currentPeriodKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM

async function getUsageForUser(userId) {
  const periodKey = currentPeriodKey();
  await sql`
    CREATE TABLE IF NOT EXISTS user_usage (
      user_id VARCHAR(255) PRIMARY KEY,
      plan VARCHAR(20) DEFAULT 'free',
      audits_used INTEGER DEFAULT 0,
      period_key VARCHAR(7) NOT NULL,
      token_limit INTEGER DEFAULT 2000,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const { rows } = await sql`
    SELECT plan, audits_used, period_key
    FROM user_usage
    WHERE user_id = ${userId}
  `;

  if (rows.length === 0) {
    await sql`
      INSERT INTO user_usage (user_id, plan, audits_used, period_key, token_limit)
      VALUES (${userId}, 'free', 0, ${periodKey}, ${FREE_MAX_TOKENS})
    `;
    return { plan: "free", auditsUsed: 0, periodKey, tokenLimit: FREE_MAX_TOKENS };
  }

  const row = rows[0];
  let auditsUsed = row.audits_used || 0;
  let storedPeriodKey = row.period_key;

  if (storedPeriodKey !== periodKey) {
    await sql`
      UPDATE user_usage
      SET audits_used = 0, period_key = ${periodKey}, updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    auditsUsed = 0;
    storedPeriodKey = periodKey;
  }

  const plan = row.plan || "free";
  let tokenLimit = FREE_MAX_TOKENS;
  if (plan === "pro") tokenLimit = PRO_MAX_TOKENS;
  else if (["design", "enterprise", "agency"].includes(plan)) tokenLimit = ULTRA_MAX_TOKENS;

  return { plan, auditsUsed, periodKey: storedPeriodKey, tokenLimit };
}

export async function POST(req) {
  try {
    const session = await getSession();
    const userId = session?.id;
    const periodKey = currentPeriodKey();

    // --- 0. IP TRACKING ---
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";

    // --- DETERMINING LIMITS ---
    let usage = { plan: "guest", auditsUsed: 0, tokenLimit: FREE_MAX_TOKENS };

    if (userId) {
      // LOGGED IN USER
      usage = await getUsageForUser(userId);
      const limit = ["design", "enterprise", "agency"].includes(usage.plan) ? Infinity : (usage.plan === "pro" ? PRO_AUDIT_LIMIT : FREE_AUDIT_LIMIT);

      if (usage.auditsUsed >= limit) {
        return NextResponse.json(
          { error: "Free plan limit reached. Upgrade to continue.", error_code: "PLAN_LIMIT", plan: usage.plan, limit, audits_used: usage.auditsUsed },
          { status: 402 }
        );
      }

      // Update User IP
      try {
        await sql`UPDATE users SET last_ip = ${ip} WHERE id = ${userId}`;
      } catch (e) { console.error("Failed to update user IP", e); }

    } else {
      // GUEST USER
      // Check IP usage in audits table (where user_id is NULL)
      const { rows: guestRows } = await sql`
        SELECT COUNT(*) as count 
        FROM audits 
        WHERE ip_address = ${ip} AND user_id IS NULL
      `;
      const guestUsed = parseInt(guestRows[0].count || "0");

      if (guestUsed >= GUEST_AUDIT_LIMIT) {
        return NextResponse.json(
          { error: "Guest limit reached. Sign up for more.", error_code: "PLAN_LIMIT", plan: "guest", limit: GUEST_AUDIT_LIMIT, audits_used: guestUsed },
          { status: 402 }
        );
      }

      usage = { plan: "guest", auditsUsed: guestUsed, tokenLimit: FREE_MAX_TOKENS };
    }

    const formData = await req.formData();
    const files = formData.getAll("file");
    const framework = formData.get("framework") || "nielsen";
    const mode = formData.get("mode") || "upload";
    const url = formData.get("url");

    // 1. Handle Input (File vs URL)
    let base64 = "";
    let mimeType = "";
    let publicImageUrl = "";
    const images = [];

    const normalizeUrl = (u) => {
      if (!u) return "";
      let target = u.trim();
      if (!target.startsWith("http")) target = "https://" + target;
      return target;
    };

    const captureScreenshot = async (tUrl) => {
      const sUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(tUrl)}?w=1024&h=768`;
      let attempts = 0;
      while (attempts < 5) {
        if (attempts > 0) await new Promise(r => setTimeout(r, 2000));
        try {
          const res = await fetch(sUrl);
          const ab = await res.arrayBuffer();
          if (ab.byteLength > 6000) {
            return { base64: Buffer.from(ab).toString("base64"), mimeType: "image/jpeg", publicUrl: sUrl };
          }
        } catch (e) { }
        attempts++;
      }
      return null;
    };

    if ((mode === "url" || mode === "accessibility") && url) {
      const targetUrl = normalizeUrl(url);
      const captured = await captureScreenshot(targetUrl);
      if (!captured) return NextResponse.json({ error: "Failed to capture URL", error_code: "SCREENSHOT_FAILED" }, { status: 500 });
      images.push(captured);
      base64 = captured.base64;
      mimeType = captured.mimeType;
      publicImageUrl = captured.publicUrl;
    } else if (mode === "crawler" && url) {
      const targetUrl = normalizeUrl(url);
      try {
        const htmlRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (AuditBot/1.0)' } });
        const html = await htmlRes.text();
        const baseDomain = new URL(targetUrl).hostname;
        const links = new Set();
        const regex = /href=["']((?:https?:\/\/[^"']+|(?:\/[^"']*)))["']/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
          try {
            const absoluteUrl = new URL(match[1], targetUrl).href;
            if (new URL(absoluteUrl).hostname === baseDomain && absoluteUrl !== targetUrl && !absoluteUrl.includes("#")) {
              links.add(absoluteUrl);
            }
          } catch (e) { }
        }
        const priorityWords = ['pricing', 'about', 'features', 'contact', 'login', 'signup'];
        const sortedLinks = Array.from(links).sort((a, b) => {
          const aScore = priorityWords.some(w => a.toLowerCase().includes(w)) ? 1 : 0;
          const bScore = priorityWords.some(w => b.toLowerCase().includes(w)) ? 1 : 0;
          return bScore - aScore;
        });
        const targets = [targetUrl, ...sortedLinks.slice(0, 2)];
        const results = await Promise.all(targets.map(t => captureScreenshot(t)));
        const validResults = results.filter(r => r !== null);
        if (validResults.length === 0) return NextResponse.json({ error: "Failed to crawl site", error_code: "CRAWL_FAILED" }, { status: 500 });
        validResults.forEach(img => images.push(img));
        base64 = images[0].base64;
        mimeType = images[0].mimeType;
        publicImageUrl = images[0].publicUrl;
      } catch (e) {
        return NextResponse.json({ error: "Failed to access site URL: " + e.message, error_code: "FETCH_FAILED" }, { status: 400 });
      }
    } else if (files && files.length > 0) {
      for (const fileObj of files) {
        const bytes = await fileObj.arrayBuffer();
        const b64 = Buffer.from(bytes).toString("base64");
        const mt = fileObj.type;
        let blobUrl = "";
        try {
          const blob = await put(fileObj.name, fileObj, { access: 'public' });
          blobUrl = blob.url;
        } catch (e) { }
        images.push({ base64: b64, mimeType: mt, publicUrl: blobUrl });
      }
      if (images.length > 0) {
        base64 = images[0].base64;
        mimeType = images[0].mimeType;
        publicImageUrl = images[0].publicUrl;
      }
    } else {
      return NextResponse.json({ error: "No content to analyze", error_code: "NO_INPUT" }, { status: 400 });
    }

    // 2. AI Analysis - BATCH PROCESS EACH IMAGE SEPARATELY
    if (!GROQ_API_KEY || !groq) {
      return NextResponse.json({ error: "Groq API key missing", error_code: "MISSING_GROQ" }, { status: 500 });
    }

    // Helper function to analyze a single image
    const analyzeImage = async (img, imageIndex, totalImages) => {
      const singleImagePrompt = `
        You are a senior UX heuristic evaluator with 10+ years at top agencies (Baymard / Nielsen Norman Group level).
        Analyze this SINGLE UI screenshot using **${framework === 'nielsen' ? "Jakob Nielsen's 10 Usability Heuristics" : framework === 'wcag' ? 'WCAG 2.1 AA/AAA Accessibility Guidelines' : 'Gestalt Principles of Visual Design'}**.
        ${mode === 'accessibility' ? 'SPECIAL MODE: ACCESSIBILITY FOCUS - Prioritize contrast, touch targets, and visual hierarchy.' : ''}
        
        YOU MUST RETURN JSON ONLY. NO MARKDOWN.
        
        CRITICAL: You MUST find EXACTLY 4-5 distinct usability issues in this screenshot. 
        Look for: Layout problems, Typography issues, Color/contrast, Interaction gaps, Content clarity, Navigation issues.
        Each issue must reference a SPECIFIC visible element with exact location.
        
        ${framework === 'nielsen' ? `
        Use Nielsen's 10 Heuristics:
        1. Visibility of system status
        2. Match between system and real world
        3. User control and freedom
        4. Consistency and standards
        5. Error prevention
        6. Recognition rather than recall
        7. Flexibility and efficiency of use
        8. Aesthetic and minimalist design
        9. Help users recognize, diagnose, recover from errors
        10. Help and documentation
        ` : ''}

        JSON SCHEMA (return EXACTLY this structure):
        {
          "ui_title": "Brief title for this page/section",
          "score": 0-100,
          "ux_metrics": {
            "clarity": 0-10,
            "efficiency": 0-10,
            "consistency": 0-10,
            "aesthetics": 0-10,
            "accessibility": 0-10
          },
          "audit": [
            {
              "title": "Issue 1 title",
              "issue": "Exact problem description with specific screen location",
              "severity": "critical|high|medium|low",
              "category": "Layout|Typography|Color|Interaction|Content|Navigation",
              "heuristic": "Nielsen #X: Heuristic Name",
              "impact": "~XX% of users affected",
              "coordinates": "35,70",
              "solution": "Specific CSS or code fix"
            },
            {
              "title": "Issue 2 title",
              "issue": "Different problem...",
              "severity": "medium",
              "category": "Typography",
              "heuristic": "Nielsen #4: Consistency",
              "impact": "~XX% of users...",
              "coordinates": "75,25",
              "solution": "Fix..."
            },
            {
              "title": "Issue 3 title",
              "issue": "Another problem...",
              "severity": "low",
              "category": "Color",
              "heuristic": "Nielsen #8: Aesthetic",
              "impact": "~XX% of users...",
              "coordinates": "50,55",
              "solution": "Fix..."
            },
            {
              "title": "Issue 4 title",
              "issue": "Fourth problem...",
              "severity": "medium",
              "category": "Interaction",
              "heuristic": "Nielsen #1: Visibility",
              "impact": "~XX% of users...",
              "coordinates": "20,80",
              "solution": "Fix..."
            }
          ],
          "key_strengths": ["Strength 1", "Strength 2"],
          "key_weaknesses": ["Weakness 1", "Weakness 2"]
        }

        RULES:
        1. Return EXACTLY 4-5 audit findings. No fewer. This is mandatory.
        2. Each finding must have unique title, category, and heuristic.
        3. Coordinates MUST be two numbers (0-100) separated by comma, like "35,70" or "85,15". The first number is X position (0=left edge, 100=right edge). The second is Y position (0=top, 100=bottom). Point to where the problem is visible.
        4. Do NOT put impact % in the issue field - only in impact field.
      `;

      const result = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: singleImagePrompt },
              { type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.base64}` } }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const responseText = result.choices[0]?.message?.content || "{}";
      return JSON.parse(responseText);
    };

    // Process all images in batch (one at a time for focused analysis)
    let allImageResults = [];
    let overallScore = 0;
    let globalStrengths = [];
    let globalWeaknesses = [];
    let globalMetrics = { clarity: 0, efficiency: 0, consistency: 0, aesthetics: 0, accessibility: 0 };
    let strategicAudit = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const imgResult = await analyzeImage(images[i], i, images.length);
        allImageResults.push({
          index: i,
          ui_title: imgResult.ui_title || `Screenshot ${i + 1}`,
          ux_metrics: imgResult.ux_metrics || { clarity: 5, efficiency: 5, consistency: 5, aesthetics: 5, accessibility: 5 },
          audit: (imgResult.audit || []).map(item => ({
            title: item.title || "Issue Detected",
            issue: item.issue || "No description",
            solution: item.solution || "No solution",
            severity: item.severity || "medium",
            category: item.category || "General",
            heuristic: item.heuristic || null,
            impact: item.impact || null,
            coordinates: item.coordinates || null
          }))
        });

        overallScore += (imgResult.score || 70);
        globalStrengths.push(...(imgResult.key_strengths || []));
        globalWeaknesses.push(...(imgResult.key_weaknesses || []));

        const m = imgResult.ux_metrics || {};
        globalMetrics.clarity += (m.clarity || 5);
        globalMetrics.efficiency += (m.efficiency || 5);
        globalMetrics.consistency += (m.consistency || 5);
        globalMetrics.aesthetics += (m.aesthetics || 5);
        globalMetrics.accessibility += (m.accessibility || 5);
      }

      // Average the scores and metrics
      const imgCount = images.length || 1;
      overallScore = Math.round(overallScore / imgCount);
      globalMetrics.clarity = Math.round(globalMetrics.clarity / imgCount);
      globalMetrics.efficiency = Math.round(globalMetrics.efficiency / imgCount);
      globalMetrics.consistency = Math.round(globalMetrics.consistency / imgCount);
      globalMetrics.aesthetics = Math.round(globalMetrics.aesthetics / imgCount);
      globalMetrics.accessibility = Math.round(globalMetrics.accessibility / imgCount);

    } catch (modelErr) {
      return NextResponse.json({
        error: "Model inference failed",
        error_code: "MODEL_ERROR",
        error_reason: modelErr.message
      }, { status: modelErr.status || 500 });
    }

    // Combine all audits for legacy compatibility
    const normalizedAudit = allImageResults.flatMap(img => img.audit);
    const normalizedImages = allImageResults;

    // Create summary from first image or aggregate
    const parsedData = {
      score: overallScore,
      summary_title: allImageResults[0]?.ui_title || "UI Audit",
      summary_text: `Analyzed ${images.length} screenshot(s) with ${normalizedAudit.length} total findings.`,
      ux_metrics: globalMetrics,
      key_strengths: [...new Set(globalStrengths)].slice(0, 3),
      key_weaknesses: [...new Set(globalWeaknesses)].slice(0, 3),
      images: normalizedImages
    };
    // strategicAudit for legacy support (not used in new batch processing but needed for summary)
    const strategicAuditList = (parsedData.strategic_audit || []).map((item) => ({
      title: item.title || "Strategic Insight",
      issue: item.issue || "Observation",
      solution: item.solution || "Recommendation"
    }));

    const uiTitle = parsedData.summary_title || parsedData.images?.[0]?.ui_title || "Untitled Audit";

    // 3. Save to Database
    let savedId = null;
    try {
      const fullAnalysis = {
        ...parsedData,
        audit: normalizedAudit,
        ui_title: uiTitle
      };
      const dbRes = await sql`
        INSERT INTO audits(user_id, ui_title, image_url, framework, analysis, ip_address)
        VALUES(${userId || null}, ${uiTitle}, ${publicImageUrl || null}, ${framework}, ${JSON.stringify(fullAnalysis)}, ${ip})
        RETURNING id
      `;
      savedId = dbRes.rows[0]?.id;
    } catch (dbErr) {
    }

    // Update Usage
    if (userId) {
      await sql`UPDATE user_usage SET audits_used = audits_used + 1, updated_at = NOW() WHERE user_id = ${userId}`;
    }

    const response = NextResponse.json({
      success: true,
      id: savedId,
      ui_title: uiTitle,
      audit: normalizedAudit, // Detailed Findings (all combined)
      images: normalizedImages, // Per-image audits for multi-image navigation
      summary: {
        summary_text: parsedData.summary_text || "",
        ui_title: uiTitle,
        audit: strategicAuditList // Use the actual strategic insights from AI
      },
      score: parsedData.score || 0,
      ux_metrics: parsedData.ux_metrics || {},
      key_strengths: parsedData.key_strengths || [],
      key_weaknesses: parsedData.key_weaknesses || [],
      image_url: publicImageUrl || null,
      target_url: (mode === 'url' || mode === 'crawler' || mode === 'accessibility') ? url : null
    });

    if (!userId) {
      response.cookies.set("guest_audit_count", (usage.auditsUsed + 1).toString(), { path: "/", maxAge: 2592000 });
    }

    return response;

  } catch (error) {
    return NextResponse.json({ error: "Server Error", error_code: "SERVER_ERROR" }, { status: 500 });
  }
}