import Groq from "groq-sdk";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { headers } from "next/headers";

// Ensure Node.js runtime for Buffer and database libraries
export const runtime = "nodejs";

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

    if (mode === "url" && url || mode === "accessibility" && url) {
      // Helper to capture a single URL
      // Check if URL starts with http
      const normalizeUrl = (u) => {
        if (!u.startsWith("http")) return "https://" + u;
        return u;
      }
      const targetUrl = normalizeUrl(url);

      const captureScreenshot = async (tUrl) => {
        // Reduced resolution to 1024x768 to prevent payload bloat
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

      if (url) {
        images.push(await captureScreenshot(targetUrl)); // Always get main URL
      }

      if (images[0] === null) return NextResponse.json({ error: "Failed to capture main URL", error_code: "SCREENSHOT_FAILED" }, { status: 500 });

      // Update global vars for single image compat check later
      base64 = images[0].base64;
      mimeType = images[0].mimeType;
      publicImageUrl = images[0].publicUrl;
    } else if (mode === "crawler" && url) {
      // CRAWLER MODE
      // 1. Fetch HTML to find links
      try {
        const normalizeUrl = (u) => {
          if (!u.startsWith("http")) return "https://" + u;
          return u;
        }
        const targetUrl = normalizeUrl(url);

        const htmlRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (AuditBot/1.0)' } });
        const html = await htmlRes.text();

        // 2. Extract Internal Links
        const baseDomain = new URL(targetUrl).hostname;
        const links = new Set();
        const regex = /href=["']((?:https?:\/\/[^"']+|(?:\/[^"']*)))["']/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
          try {
            const absoluteUrl = new URL(match[1], targetUrl).href;
            // Filter: Internal only, not the same as root, no fragments
            if (new URL(absoluteUrl).hostname === baseDomain && absoluteUrl !== targetUrl && !absoluteUrl.includes("#")) {
              links.add(absoluteUrl);
            }
          } catch (e) { }
        }

        // 3. Select Top 3 Links (Prioritize common pages)
        const priorityWords = ['pricing', 'about', 'features', 'contact', 'login', 'signup'];
        const sortedLinks = Array.from(links).sort((a, b) => {
          const aScore = priorityWords.some(w => a.toLowerCase().includes(w)) ? 1 : 0;
          const bScore = priorityWords.some(w => b.toLowerCase().includes(w)) ? 1 : 0;
          return bScore - aScore;
        });
        // Limit to Root + 2 subpages (Max 3 total) to stay within AI limits
        const targets = [targetUrl, ...sortedLinks.slice(0, 2)];

        // 4. Batch Screenshot
        const capture = async (tUrl) => {
          const sUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(tUrl)}?w=1024&h=768`;
          // Shorter retry for crawler to avoid timeout
          let attempts = 0;
          while (attempts < 4) {
            if (attempts > 0) await new Promise(r => setTimeout(r, 2500));
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

        // Parallel execution
        const results = await Promise.all(targets.map(t => capture(t)));
        const validResults = results.filter(r => r !== null);

        if (validResults.length === 0) return NextResponse.json({ error: "Failed to crawl site", error_code: "CRAWL_FAILED" }, { status: 500 });

        validResults.forEach(img => images.push(img));

        // Set primaries for compatibility
        base64 = images[0].base64;
        mimeType = images[0].mimeType;
        publicImageUrl = images[0].publicUrl;

      } catch (e) {
        console.error("Crawl error:", e);
        return NextResponse.json({ error: "Failed to access site URL: " + e.message, error_code: "FETCH_FAILED" }, { status: 400 });
      }

    } else if (files && files.length > 0) {
      // Handle File Upload
      for (const fileObj of files) {
        const bytes = await fileObj.arrayBuffer();
        const b64 = Buffer.from(bytes).toString("base64");
        const mt = fileObj.type;

        let blobUrl = "";
        // ALWAYS try to upload blob if possible, or just skip if no user? 
        // Vercel Blob might require auth depending on config, but usually server-side is fine.
        // For guest, we might want to skip blob storage if we want to save costs, 
        // BUT we need a URL for the database 'image_url' column if we want to show it in admin.
        // Let's allow blob upload for guests too for now to ensure Admin can see it.
        try {
          const blob = await put(fileObj.name, fileObj, { access: 'public' });
          blobUrl = blob.url;
        } catch (e) {
          console.error("Blob upload failed (expected if no token configured)", e);
        }

        images.push({ base64: b64, mimeType: mt, publicUrl: blobUrl });
      }
      // Use the first image as primary for legacy fields
      if (images.length > 0) {
        base64 = images[0].base64;
        mimeType = images[0].mimeType;
        publicImageUrl = images[0].publicUrl;
      }
    } else {
      return NextResponse.json({ error: "No content to analyze", error_code: "NO_INPUT" }, { status: 400 });
    }

    // 2. AI Analysis
    if (!GROQ_API_KEY || !groq) {
      return NextResponse.json({ error: "Groq API key missing or client unavailable", error_code: "MISSING_GROQ" }, { status: 500 });
    }
    if (!base64 || !mimeType) {
      return NextResponse.json({ error: "Invalid input image or URL", error_code: "INVALID_INPUT" }, { status: 400 });
    }
    const prompt = `
      You are a World-Class UX Consultant & Information Designer. 
      Your job is NOT just to find errors, but to provide a data-driven, visually-oriented strategic audit that could be presented to a Fortune 500 CEO.
      
      CONTEXT:
      You are auditing ${mode === 'crawler' ? 'a multi-page website scan' : (mode === 'url' ? 'a live website homepage' : 'UI screenshots')} using the **${framework}** framework.
      ${mode === 'accessibility' ? `
      SPECIAL MODE: ACCESSIBILITY PERSONA TESTING (WCAG 2.1 AA/AAA)
      Simulate:
      1. Maria (Low Vision, 200% Zoom)
      2. Ali (Screen Reader)
      3. Sam (Motor Impairment, Keyboard Only)
      ` : ''}

      OBJECTIVE:
      Generate a "Crazy Good" analysis that powers a high-end dashboard with charts, gauges, and heatmaps.
      
      YOU MUST RETURN JSON ONLY. NO MARKDOWN.
      
      JSON SCHEMA:
      {
        "score": 85, // Integer 0-100. Overall UX Score.
        "summary_title": "Executive Headline (e.g., 'Strong Visuals but Weak Accessibility')",
        "summary_text": "A 2-3 sentence high-level executive summary.",
        "ux_metrics": {
           "clarity": 8, // 0-10 rating
           "efficiency": 7, // 0-10 rating
           "consistency": 9, // 0-10 rating
           "aesthetics": 6, // 0-10 rating
           "accessibility": 5 // 0-10 rating
        },
        "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
        "key_weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
        "images": [
          {
            "index": 0,
            "ui_title": "Section Name",
            "audit": [
              {
                "title": "Issue Title",
                "issue": "Description of the problem.",
                "solution": "Specific, actionable fix.",
                "severity": "critical" | "high" | "medium" | "low",
                "category": "Layout" | "Color" | "Typography" | "Navigation" | "Accessibility"
              }
            ]
          }
        ]
      }
      
      SCORING CRITERIA:
      - 90-100: World Class (Apple/Stripe level)
      - 80-89: Great, minor details missing
      - 70-79: Good, but usability friction exists
      - 60-69: Average, needs polish
      - <60: Significant issues
      
      INSTRUCTIONS:
      1. Be brutal but constructive.
      2. Analyze the visual hierarchy deeply. 
      3. For "Strategic Insights", look for patterns across the whole design.
    `;

    let result;
    try {
      // Build messages with image support for Llama 4 Scout vision model
      // The last message must use array format with image_url
      const userMessageContent = [
        { type: "text", text: prompt },
        ...images.map((img) => ({
          type: "image_url",
          image_url: {
            url: `data:${img.mimeType};base64,${img.base64}`
          }
        }))
      ];

      result = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a Senior UX Researcher specializing in UI/UX audits. Always return valid JSON with no markdown formatting."
          },
          {
            role: "user",
            content: userMessageContent
          }
        ],
        temperature: 0.7
      });
    } catch (modelErr) {
      console.error("Groq API error:", modelErr);
      const reason = typeof modelErr?.message === "string" ? modelErr.message : "unknown";
      const status = typeof modelErr?.status === "number" ? modelErr.status : 502;
      let userMessage = status === 429 ? "AI quota exceeded. Please wait and try again." : "Model inference failed";

      if (status === 413 || reason.includes("too large") || reason.includes("payload")) {
        userMessage = "The analysis payload is too large. Trying scanning fewer pages.";
      }

      return NextResponse.json({ error: userMessage, error_code: "MODEL_ERROR", error_reason: reason }, { status });
    }

    const responseText = (result.choices[0]?.message?.content ?? "").toString().replace(/```json|```/g, "").trim();
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("AI JSON parse error:", parseErr, responseText);
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    // Aggregate flat audit for backward compatibility
    // Prioritize detailed findings from 'images' array over the 'summary'
    const detailedAudits = Array.isArray(parsedData?.images)
      ? parsedData.images.flatMap((g) => g.audit || [])
      : [];

    const flatAudit = detailedAudits.length > 0
      ? detailedAudits
      : (Array.isArray(parsedData?.summary?.audit) ? parsedData.summary.audit : []);

    // BACKWARD COMPATIBILITY: Map new schema (title, issue, solution) to old schema (title, critique, fix)
    const normalizedAudit = flatAudit.map(item => ({
      title: item.title || item.issue?.substring(0, 50) + "..." || "Issue Detected",
      issue: item.issue || item.critique || "No description provided",
      solution: item.solution || item.fix || "No solution provided",
      critique: item.issue || item.critique || "No description provided", // Old field
      fix: item.solution || item.fix || "No solution provided",          // Old field
      severity: item.severity || "medium",
      category: item.category || "General"
    }));

    // GUEST RESTRICTION: Show only 1 issue IF it was a guest (but we are allowing 1 FULL report for guest)
    // Wait, the requirement says: "a new user can do one audit and get one audit pdf report without sign in"
    // So we should GIVE THEM THE FULL REPORT for that one allowed audit.
    // We only restrict IF they try to do MORE than 1.
    // So I will REMOVE the truncation logic for the allowed guest audit.

    let finalAudit = normalizedAudit;
    let isTruncated = false;
    let hiddenIssuesCount = 0;

    // 3. Save to Database (NOW FOR BOTH USERS AND GUESTS)
    let savedAuditId = null;
    if (images.length > 0 && parsedData) {
      try {
        // Build the FULL analysis object to save
        const fullAnalysis = {
          score: parsedData.score || 0,
          ux_metrics: parsedData.ux_metrics || {},
          key_strengths: parsedData.key_strengths || [],
          key_weaknesses: parsedData.key_weaknesses || [],
          summary: parsedData.summary || {},
          audit: normalizedAudit, // Use the normalized (clean) audit array
          ui_title: parsedData?.summary?.ui_title || parsedData?.images?.[0]?.ui_title || "Untitled Scan"
        };

        // Save one record per scan (not per image) for simplicity
        const urlToSave = images[0]?.publicUrl || publicImageUrl || null;

        // Handle NULL userId for Guests
        // sql template literal handles nulls correctly usually, but we need to be explicit if it's undefined
        const safeUserId = userId || null;

        const dbResult = await sql`
          INSERT INTO audits (user_id, ui_title, image_url, framework, analysis, ip_address)
          VALUES (${safeUserId}, ${fullAnalysis.ui_title}, ${urlToSave}, ${framework}, ${JSON.stringify(fullAnalysis)}, ${ip})
          RETURNING id
        `;
        savedAuditId = dbResult.rows[0]?.id;
      } catch (dbError) {
        console.error("DB Save Failed:", dbError);
        // Don't crash
      }
    }

    // Increment usage on success
    let response = NextResponse.json({
      success: true,
      id: savedAuditId,
      ui_title: parsedData?.summary?.ui_title || parsedData?.images?.[0]?.ui_title || "Untitled Scan",
      audit: finalAudit,
      score: parsedData.score || 0,
      ux_metrics: parsedData.ux_metrics || {},
      key_strengths: parsedData.key_strengths || [],
      key_weaknesses: parsedData.key_weaknesses || [],
      summary: parsedData.summary || {},
      analysis_grouped: parsedData?.images || null,
      image_url: publicImageUrl || null,
      limits: {
        plan: usage.plan,
        audits_used: usage.auditsUsed + 1,
        limit: ["pro", "design", "enterprise", "agency"].includes(usage.plan) ? null : (userId ? FREE_AUDIT_LIMIT : GUEST_AUDIT_LIMIT),
        token_limit: usage.tokenLimit,
        period_key: periodKey
      },
      guest_truncated: isTruncated,
      hidden_issues_count: hiddenIssuesCount,
      target_url: mode === 'url' || mode === 'crawler' || mode === 'accessibility' ? url : null
    });

    if (userId) {
      await sql`
        UPDATE user_usage
        SET audits_used = audits_used + 1, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    } else {
      // Guest usage is tracked via DB counts now, but we can still set cookie for frontend convenience
      const newCount = usage.auditsUsed + 1;
      response.cookies.set("guest_audit_count", newCount.toString(), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;

  } catch (error) {
    console.error("Server Error:", error);
    // Try to surface a minimal reason without leaking sensitive data
    const message = typeof error?.message === "string" ? error.message : "Unknown error";
    return NextResponse.json({ error: "Analysis failed. Try again.", error_code: "SERVER_ERROR", error_reason: message }, { status: 500 });
  }
}