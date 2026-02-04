import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        // Get guest audits grouped by IP
        const guestAudits = await sql`
            SELECT 
                ip_address,
                COUNT(*) as audit_count,
                MAX(created_at) as last_audit,
                MIN(created_at) as first_audit,
                ARRAY_AGG(DISTINCT framework) as frameworks
            FROM audits 
            WHERE user_id IS NULL AND ip_address IS NOT NULL
            GROUP BY ip_address
            ORDER BY last_audit DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        // Get total count for pagination
        const totalCount = await sql`
            SELECT COUNT(DISTINCT ip_address) as count 
            FROM audits 
            WHERE user_id IS NULL AND ip_address IS NOT NULL
        `;

        return NextResponse.json({
            guests: guestAudits.rows.map(row => ({
                ip: row.ip_address,
                auditCount: parseInt(row.audit_count),
                lastAudit: row.last_audit,
                firstAudit: row.first_audit,
                frameworks: row.frameworks || []
            })),
            pagination: {
                page,
                limit,
                total: parseInt(totalCount.rows[0]?.count || "0"),
                totalPages: Math.ceil(parseInt(totalCount.rows[0]?.count || "0") / limit)
            }
        });

    } catch (error: any) {
        console.error("Guest Audits Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
