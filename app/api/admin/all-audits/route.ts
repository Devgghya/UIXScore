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
        const search = searchParams.get("search") || "";
        const filterType = searchParams.get("type") || "all"; // all, user, guest
        const framework = searchParams.get("framework") || "";

        // Build dynamic query
        let whereConditions = [];

        if (search) {
            whereConditions.push(`(a.ui_title ILIKE '%${search}%' OR a.ip_address ILIKE '%${search}%')`);
        }

        if (filterType === "user") {
            whereConditions.push("a.user_id IS NOT NULL");
        } else if (filterType === "guest") {
            whereConditions.push("a.user_id IS NULL");
        }

        if (framework) {
            whereConditions.push(`a.framework = '${framework}'`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

        // Get all audits with user info
        const audits = await sql.query(`
            SELECT 
                a.id,
                a.ui_title,
                a.image_url,
                a.framework,
                a.created_at,
                a.ip_address,
                a.user_id,
                COALESCE((a.analysis::json->>'score')::int, 0) as score,
                a.analysis,
                u.first_name,
                u.last_name,
                u.email
            FROM audits a
            LEFT JOIN users u ON a.user_id = u.id::text
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `);

        // Get total count
        const totalCount = await sql.query(`
            SELECT COUNT(*) as count FROM audits a ${whereClause}
        `);

        return NextResponse.json({
            audits: audits.rows.map(row => ({
                id: row.id,
                title: row.ui_title || "Untitled",
                imageUrl: row.image_url,
                framework: row.framework,
                createdAt: row.created_at,
                ip: row.ip_address,
                score: row.score || 0,
                analysis: row.analysis,
                isGuest: !row.user_id,
                user: row.user_id ? {
                    id: row.user_id,
                    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown",
                    email: row.email
                } : null
            })),
            pagination: {
                page,
                limit,
                total: parseInt(totalCount.rows[0]?.count || "0"),
                totalPages: Math.ceil(parseInt(totalCount.rows[0]?.count || "0") / limit)
            }
        });

    } catch (error: any) {
        console.error("All Audits Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
