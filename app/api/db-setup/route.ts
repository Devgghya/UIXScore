import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const results: string[] = [];

  const runQuery = async (name: string, query: any) => {
    try {
      await query;
      results.push(`✅ ${name} - SUCCESS`);
    } catch (err: any) {
      results.push(`❌ ${name} - FAILED: ${err.message}`);
    }
  };

  // 1. Core Tables
  await runQuery("Audits Table", sql`
      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        ui_title VARCHAR(255),
        image_url TEXT,
        framework VARCHAR(50),
        analysis JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45)
      );
    `);

  await runQuery("Users Table", sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        image_url TEXT,
        plan VARCHAR(50) DEFAULT 'free',
        plan_expires_at TIMESTAMP WITH TIME ZONE,
        subscription_id VARCHAR(255),
        last_ip VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 2. PayPal Orders Table (CRITICAL)
  await runQuery("Payment Orders Table", sql`
        CREATE TABLE IF NOT EXISTS payment_orders (
          id SERIAL PRIMARY KEY,
          user_id UUID,
          order_id VARCHAR(255) UNIQUE NOT NULL,
          plan_id VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          status VARCHAR(20) DEFAULT 'pending',
          payment_provider VARCHAR(20) DEFAULT 'paypal',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

  // 3. User Usage Table
  await runQuery("User Usage Table", sql`
      CREATE TABLE IF NOT EXISTS user_usage (
        user_id VARCHAR(255) PRIMARY KEY,
        plan VARCHAR(20) DEFAULT 'free',
        audits_used INTEGER DEFAULT 0,
        period_key VARCHAR(7) NOT NULL,
        token_limit INTEGER DEFAULT 2000,
        plan_expires_at TIMESTAMP WITH TIME ZONE,
        subscription_id VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

  return NextResponse.json({
    message: "Database setup completed",
    details: results
  });
}
