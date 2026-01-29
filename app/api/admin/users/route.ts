import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const emailSearch = searchParams.get("email");
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 1. Fetch Backend Usage and User Data (Joined)
        let query;
        if (emailSearch) {
            query = sql`
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.image_url,
                    u.role,
                    u.permissions,
                    u.last_ip,
                    uu.plan,
                    uu.audits_used,
                    uu.token_limit,
                    uu.updated_at as last_active,
                    (SELECT COUNT(*) FROM audits a WHERE a.user_id = u.id::text) as total_scans
                FROM users u
                LEFT JOIN user_usage uu ON u.id::text = uu.user_id
                WHERE u.email ILIKE ${'%' + emailSearch + '%'} AND u.is_verified = TRUE
                ORDER BY u.created_at DESC
            `;
        } else {
            query = sql`
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.image_url,
                    u.role,
                    u.permissions,
                    u.last_ip,
                    uu.plan,
                    uu.audits_used,
                    uu.token_limit,
                    uu.updated_at as last_active,
                    (SELECT COUNT(*) FROM audits a WHERE a.user_id = u.id::text) as total_scans
                FROM users u
                LEFT JOIN user_usage uu ON u.id::text = uu.user_id
                WHERE u.is_verified = TRUE
                ORDER BY u.created_at DESC
                LIMIT 100
            `;
        }

        const { rows } = await query;

        const enrichedUsers = rows.map(row => ({
            ...row,
            plan: row.plan || "free",
            role: row.role || "user",
            permissions: row.permissions || [],
            audits_used: row.audits_used || 0,
            token_limit: row.token_limit || 2000,
            plan_expires_at: row.plan_expires_at,
            total_scans: parseInt(row.total_scans || "0"),
        }));

        return NextResponse.json({ users: enrichedUsers });
    } catch (error) {
        console.error("Admin API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Granular check - requires 'delete_users' permission OR super_admin role
        const hasPermission = session.role === 'super_admin' || (session.permissions && session.permissions.includes('delete_users'));
        // Special case: Dev email always allowed if Admin
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",");
        const isEnvAdmin = ADMIN_EMAILS.includes(session.email);

        if (!hasPermission && !isEnvAdmin) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { userIds } = await req.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "Invalid user IDs" }, { status: 400 });
        }

        // Prevent deleting self
        if (userIds.includes(session.id)) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        // Execute De deletion
        // Note: Using ANY for array parameter if needed, or loop. Vercel Postgres supports = ANY
        // But safe way is to delete from dependent tables first if no cascade

        // Assuming CASCADE is set up or we rely on logic. 
        // For safety, let's delete strictly.

        const ids = userIds as string[];
        // Cast columns to text to avoid UUID mismatch errors
        await sql`DELETE FROM user_usage WHERE user_id::text = ANY(${ids as any}::text[])`;
        await sql`DELETE FROM audits WHERE user_id::text = ANY(${ids as any}::text[])`;
        await sql`DELETE FROM users WHERE id::text = ANY(${ids as any}::text[])`;

        return NextResponse.json({ success: true, count: userIds.length });

    } catch (error: any) {
        console.error("Admin Bulk Delete Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
