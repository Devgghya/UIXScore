import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        // Index for faster lookups
        await sql`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`;

        return NextResponse.json({ message: "Password resets table created successfully" });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
