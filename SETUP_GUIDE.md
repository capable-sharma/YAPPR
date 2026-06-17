# YAPPR Production Setup Guide

Welcome to the YAPPR production setup guide. This document explains how to configure the architecture, environment variables, database, AI integrations, and authentication for production deployment.

## 1. Environment Variables Configuration
Copy the `.env.example` file to `.env` in the root directory.
\`\`\`bash
cp .env.example .env
\`\`\`

## 2. Supabase Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Navigate to **Project Settings -> API** to get your \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\`. Add these to your \`.env\` file.
3. Get the \`SUPABASE_SERVICE_ROLE_KEY\` (keep this secret, never expose it to the frontend) and add it to your server environments.

### Database Initialization
1. Navigate to the **SQL Editor** in the Supabase Dashboard.
2. Open the \`supabase/schema.sql\` file provided in this repository.
3. Copy its contents, paste it into the SQL Editor, and click **Run**. This will create all tables, enums, RLS policies, triggers, and the storage bucket.
4. (Optional) Run the \`supabase/seed.sql\` to populate the \`vocabulary_words\` table with the initial 1000 words.

### Authentication Setup (Google OAuth)
1. Go to **Google Cloud Console**, create a project, and navigate to APIs & Services -> Credentials.
2. Create an **OAuth 2.0 Client ID** for a Web Application.
3. Set the Authorized Redirect URI to: \`https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback\`
4. Copy the Client ID and Client Secret.
5. In the Supabase Dashboard, go to **Authentication -> Providers**, enable Google, and paste your Client ID and Secret.
6. Enable **Email/Passwordless (Magic Link)** in the Auth Providers section as the fallback auth method.

## 3. AI Providers Setup
YAPPR uses a resilient dual-provider AI system: Gemini (Primary) and Cerebras Llama (Fallback).

1. **Gemini API:** Go to [Google AI Studio](https://aistudio.google.com/), create an API key, and add it to \`GEMINI_API_KEY\`.
2. **Cerebras API:** Go to [Cerebras Inference](https://inference.cerebras.ai/), create an API key, and add it to \`CEREBRAS_API_KEY\`.
3. **Groq API (Whisper):** Go to [GroqCloud](https://console.groq.com/), create an API key, and add it to \`GROQ_API_KEY\` for lightning-fast Whisper transcriptions.

## 4. Feature Gating & Roles
Roles are managed via the \`user_role\` enum (\`guest\`, \`free\`, \`premium\`).
- When a user signs up, a trigger automatically assigns them the \`free\` role.
- To upgrade a user to premium for testing, run this in the SQL Editor:
  \`\`\`sql
  UPDATE profiles SET role = 'premium' WHERE email = 'user@example.com';
  \`\`\`

## 5. Deployment
When deploying to Vercel, Netlify, or Cloudflare Pages:
1. Ensure the Node.js version is set to **22.12.x** or higher, or explicitly set the build command to use Bun: \`bun run build\`.
2. Add all environment variables from your \`.env\` file into the platform's environment settings.
3. YAPPR is configured to use Nitro/Edge deployment via the TanStack config.

You are now ready to run YAPPR in production!
