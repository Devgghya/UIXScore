import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const OLD_EMAIL = 'devkulshrestha27@gmail.com';
        const NEW_EMAIL = 'admin@uixscore.com';

        // 1. Check if the new email already exists (safety check)
        const existingNew = await sql`SELECT id FROM users WHERE email = ${NEW_EMAIL}`;
        if (existingNew.rows.length > 0) {
            // DELETE the "new" empty account so we can rename the "old" data-rich account
            await sql`DELETE FROM users WHERE email = ${NEW_EMAIL}`;
            console.log(`Deleted existing empty account for ${NEW_EMAIL} to allow migration.`);
        }

        // 2. Perform the update
        const result = await sql`
      UPDATE users 
      SET email = ${NEW_EMAIL} 
      WHERE email = ${OLD_EMAIL}
      RETURNING id, email, first_name
    `;

        if (result.rows.length === 0) {
            return NextResponse.json({ message: "Old email not found. No changes made." });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully migrated user data to ${NEW_EMAIL}`,
            user: result.rows[0]
        });

    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
