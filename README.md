# YAPPR — Stop Yapping Nonsense.

**YAPPR** is an evolving, AI-powered communication gym. Our mission is to make communication improvements accessible across the varied requirements of different users. Whether you're preparing for a placement interview, doing vocabulary drills, or practicing impromptu speaking, YAPPR forces you to train your voice with instant AI feedback. 

## 🏗 Architecture & Tech Stack

### Frontend Core
*   **Framework:** React 18 + Vite
*   **Routing & Server Functions:** TanStack Router and TanStack Start.
*   **Styling:** Tailwind CSS with a custom "Brutalist" design system (heavy borders, vibrant contrasting colors, sharp shadows).
*   **Audio Capture (Hybrid Engine):**
    *   **Desktop:** WebSpeech API for live streaming transcription.
    *   **Mobile:** `MediaRecorder` API to capture audio chunks. This explicitly solves Chrome Android WebSocket background-drop issues by bypassing native speech recognition entirely.

### AI Engine
*   **Speech-to-Text:** **Groq API (Whisper-large-v3-turbo)** — Used primarily for the mobile recorder fallback. It delivers lightning-fast, highly accurate transcriptions for the audio blobs.
*   **Analysis & Coaching:** **Google Gemini API** (`@google/genai`) — Evaluates the transcripts for Clarity, Flow, Presence, Grammar, and Content. It provides structured JSON feedback including verdicts, strengths, weaknesses, and an "ideal rewrite".

### Backend & Database (BaaS)
*   **Platform:** **Supabase** (PostgreSQL)
*   **Authentication:** Supabase Auth (Native Google OAuth via `signInWithIdToken`). Validates sessions server-side to prevent stale caching.
*   **Database Schema (`sessions` table):**
    *   Tracks `user_id` (foreign key to Supabase `auth.users`).
    *   Stores `mode`, `category`, `prompt`, `transcript`, duration, WPM, and word counts.
    *   Saves all calculated AI metrics (`clarity_score`, `flow_score`, `overall_score`, etc.) and the AI feedback arrays (strengths, counter-points).

### Hosting & Deployment
*   **Infrastructure:** **Vercel**
*   Environment variables are baked in at build-time for the frontend and securely stored for TanStack server functions in the cloud.

## 🗄 System Data Flow
1.  **Preparation:** User selects a track (Impromptu, Interview, WordBuzz) and receives a prompt (e.g., trending news, debate stance).
2.  **Execution:** User speaks into the microphone.
3.  **Transcription:** Audio is transcribed (either live via WebSpeech or post-processed via Groq Whisper).
4.  **Guardrails:** The system verifies the word count meets the minimum threshold (e.g., 45 words for Impromptu) to prevent API token waste on empty/short audio.
5.  **Analysis:** The transcript is passed to Gemini via a secure server function.
6.  **Storage & Auth:** If the user is logged in, the `saveSession` function writes the metrics to Supabase. If not, they hit a score-gate, log in via Google, and the pending session is instantly popped from `localStorage` and saved to the database.

---

## 📝 Changelog

*   **v1.0.0** — **MVP Launch.** Core app release featuring the brutalist design, responsive layout, and initial integration with Google Gemini for AI speech coaching.
*   **v1.1.0** — **User Accounts & History.** Added Google Sign-In and a database system so users can securely save and review their past practice sessions.
*   **v1.1.1** — **Mobile Recording Overhaul.** Completely replaced the mobile audio engine to fix microphone dropouts on Android/iOS, ensuring smooth recording even in the background.
*   **v1.1.2** — **Quality Filters.** Added a minimum word count threshold so short or accidental recordings are ignored instead of scored.
*   **v1.1.3** — **UI Polish.** Updated website preview text for better sharing links, cleaned up the navigation tabs by removing emojis, and finalized production assets (favicon).
