import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"Heuristo" <noreply@heuristo.ai>';

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn("⚠️ SMTP credentials missing. Email not sent.");
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Content: ${html}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html,
        });
        console.log(`✅ Email sent to ${to}`);
    } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw new Error("Failed to send verification email");
    }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `http://${process.env.NEXT_PUBLIC_APP_URL || "localhost:3000"}/reset-password?token=${token}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Reset Your Password</h2>
            <p>You requested a password reset for your UIXScore account.</p>
            <p>Click the button below to reset it. This link expires in 1 hour.</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: "Reset Your UIXScore Password",
        html
    });
}
