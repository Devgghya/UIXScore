import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "devkulshrestha27@gmail.com").split(",");

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const emailSearch = searchParams.get("email");
        const user = await currentUser();

        if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0].emailAddress)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 1. Fetch Backend Usage Data
        const { rows } = await sql`
      SELECT 
        u.user_id,
        u.plan,
        u.audits_used,
        u.token_limit,
        u.updated_at as last_active,
        COUNT(a.id) as total_scans
      FROM user_usage u
      LEFT JOIN audits a ON u.user_id = a.user_id
      GROUP BY u.user_id, u.plan, u.audits_used, u.token_limit, u.updated_at
      ORDER BY u.updated_at DESC
    `;

        // 2. Fetch User Details from Clerk
        const userIds = rows.map(r => r.user_id);
        let clerkUsers: any[] = [];

        if (userIds.length > 0) {
            try {
                const client = await clerkClient();
                const response = await client.users.getUserList({
                    userId: userIds,
                    limit: 100,
                });
                clerkUsers = response.data;
            } catch (err) {
                console.error("Failed to fetch Clerk users", err);
            }
        }

        // 3. Merge Data
        const enrichedUsers: any[] = rows.map((row: any) => {
            const clerkUser = clerkUsers.find(u => u.id === row.user_id);
            return {
                ...row,
                email: clerkUser?.emailAddresses[0]?.emailAddress || "Unknown",
                first_name: clerkUser?.firstName || "",
                last_name: clerkUser?.lastName || "",
                image_url: clerkUser?.imageUrl || "",
            };
        });

        // 4. Handle Email Search (Optional)
        if (emailSearch) {
            try {
                const client = await clerkClient();
                const searchResponse = await client.users.getUserList({
                    emailAddress: [emailSearch],
                    limit: 1,
                });

                if (searchResponse.data.length > 0) {
                    const searchUser = searchResponse.data[0];
                    // Check if they are already in enrichedUsers
                    const existing = enrichedUsers.find(u => u.user_id === searchUser.id);
                    if (!existing) {
                        enrichedUsers.unshift({
                            user_id: searchUser.id,
                            plan: "free", // Default for display
                            audits_used: 0,
                            token_limit: 2000,
                            last_active: null,
                            total_scans: 0,
                            email: searchUser.emailAddresses[0]?.emailAddress || "Unknown",
                            first_name: searchUser.firstName || "",
                            last_name: searchUser.lastName || "",
                            image_url: searchUser.imageUrl || "",
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to search Clerk user", err);
            }
        }

        return NextResponse.json({ users: enrichedUsers });
    } catch (error) {
        console.error("Admin API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
