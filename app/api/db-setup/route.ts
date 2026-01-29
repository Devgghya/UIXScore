import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        ui_title VARCHAR(255),
        image_url TEXT,
        framework VARCHAR(50),
        analysis JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

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

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // --- MIGRATIONS (Idempotent) ---
    try {
      // 1. Add IP Address to Audits
      await sql`ALTER TABLE audits ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`;

      // 2. Make user_id NULLABLE in audits (for Guest mode)
      await sql`ALTER TABLE audits ALTER COLUMN user_id DROP NOT NULL`;

      // 3. Add last_ip to users
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip VARCHAR(45)`;

    } catch (migErr) {
      console.log("Migration notice (safe to ignore if columns exist):", migErr);
    }

    return NextResponse.json({ message: "Tables created/updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
