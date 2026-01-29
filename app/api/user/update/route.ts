import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { firstName, lastName, imageUrl } = await req.json();

        // Validate
        if (!firstName || !lastName) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await sql`
            UPDATE users
            SET first_name = ${firstName}, last_name = ${lastName}, image_url = ${imageUrl || null}
            WHERE id = ${session.id}
        `;

        // Update session with new data
        const updatedUser = {
            ...session,
            firstName,
            lastName,
            imageUrl: imageUrl || session.imageUrl
        };

        // Create new JWT token with updated data
        const { createToken } = await import("@/lib/auth");
        const newToken = await createToken(updatedUser);
        await setSession(newToken);

        return NextResponse.json({
            success: true,
            message: "Profile updated",
            user: updatedUser
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
