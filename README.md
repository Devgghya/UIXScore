# Heuristic.ai ⚡️

Heuristic.ai is a powerful, AI-driven design auditing platform that helps designers and developers identify UX issues and accessibility gaps in seconds. Whether you're auditing a live URL or a screenshot, Heuristic.ai provides actionable feedback based on industry-standard frameworks like Nielsen's Heuristics and WCAG 2.1.

## 🚀 Features

- **AI-Powered Audits**: Get deep insights into UX, accessibility, and visual design using meta-llama/llama-4.
- **Competitor Benchmarking**: Compare your site against competitors side-by-side with automated scoring and detailed metric breakdowns.
- **Freemium Model**: Tiered access levels (Free, Lite, Plus, Pro, Agency) integrated seamlessly with **Razorpay**.
- **Admin Console**: A secure, restricted dashboard for the founder to manage users, monitor usage, and revoke subscriptions.
- **Theme Support**: Beautiful Light and Dark modes with automatic synchronization for Clerk authentication.
- **PDF Reports**: Generate and export professional, high-contrast PDF reports for clients or stakeholders.
- **Multi-Framework Support**: Choose between Nielsen Heuristics, WCAG 2.1, or Gestalt Principles for your audits.

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Styling**: Tailwind CSS 4
- **Authentication**: [Clerk](https://clerk.com/)
- **Database**: [Vercel Postgres (Neon)](https://neon.tech/)
- **AI Engine**: meta-llama/llama-4-scout-17b-16e-instruct via [Groq](https://groq.com/)
- **Payments**: [Razorpay](https://razorpay.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/) (select components)

## 🏁 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/devgghya/heuristic-ai.git
cd heuristic-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add the following variables:

```env
# AI & LLM
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database (Neon/Postgres)
DATABASE_URL=your_postgres_url

# Payments (Razorpay)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 4. Database Schema
Initialize your Postgres database with the following tables:

```sql
-- Usage & Subscription Tracking
CREATE TABLE IF NOT EXISTS user_usage (
  user_id VARCHAR(255) PRIMARY KEY,
  plan VARCHAR(20) DEFAULT 'free',
  audits_used INTEGER DEFAULT 0,
  period_key VARCHAR(7) NOT NULL,
  token_limit INTEGER DEFAULT 2000,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit History
CREATE TABLE IF NOT EXISTS audits (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  ui_title TEXT NOT NULL,
  image_url TEXT,
  framework TEXT,
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the results.

## 👮‍♂️ Admin Console
Access the restricted admin area at `/admin`. Note that access is hardcoded to specific admin emails for security.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

Developed with ❤️ by the Heuristic.ai Team.
