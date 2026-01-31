import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Check for token
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.error("Missing BLOB_READ_WRITE_TOKEN");
            return NextResponse.json({ error: "Server configuration error: Missing Blob Token" }, { status: 500 });
        }

        // Upload to Vercel Blob
        const blob = await put(file.name, file, {
            access: "public",
            addRandomSuffix: true, // Use this for unique names
        });

        return NextResponse.json(blob);
    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
