import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
    try {
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Fetch all stats in parallel
        const [
            totalUsersResult,
            totalAuditsResult,
            guestAuditsResult,
            auditsToday,
            proUsersResult,
            newUsersMonth,
            topFrameworks
        ] = await Promise.all([
            // Total registered users
            sql`SELECT COUNT(*) as count FROM users WHERE is_verified = TRUE`,

            // Total audits (all time)
            sql`SELECT COUNT(*) as count FROM audits`,

            // Guest audits (no user_id)
            sql`SELECT COUNT(*) as count FROM audits WHERE user_id IS NULL`,

            // Audits today
            sql`SELECT COUNT(*) as count FROM audits WHERE created_at >= CURRENT_DATE`,

            // Pro subscribers
            sql`SELECT COUNT(*) as count FROM user_usage WHERE plan = 'pro'`,

            // New users this month
            sql`SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND is_verified = TRUE`,

            // Top frameworks used
            sql`SELECT framework, COUNT(*) as count FROM audits GROUP BY framework ORDER BY count DESC LIMIT 5`
        ]);

        // Recent activity (last 7 days trend)
        const weeklyTrend = await sql`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM audits 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        `;

        return NextResponse.json({
            stats: {
                totalUsers: parseInt(totalUsersResult.rows[0]?.count || "0"),
                totalAudits: parseInt(totalAuditsResult.rows[0]?.count || "0"),
                guestAudits: parseInt(guestAuditsResult.rows[0]?.count || "0"),
                auditsToday: parseInt(auditsToday.rows[0]?.count || "0"),
                proUsers: parseInt(proUsersResult.rows[0]?.count || "0"),
                newUsersMonth: parseInt(newUsersMonth.rows[0]?.count || "0"),
            },
            topFrameworks: topFrameworks.rows,
            weeklyTrend: weeklyTrend.rows
        });

    } catch (error: any) {
        console.error("Admin Stats Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
