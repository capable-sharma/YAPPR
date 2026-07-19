import { supabase } from "./supabase";

/** Send a magic link to the given email. Returns error string or null on success. */
export async function sendMagicLink(email: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) return error.message;
  return null;
}

/** Get the current signed-in Supabase user. Returns null if not logged in. */
export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/** Derive a display name from the Supabase user object. */
export function getDisplayName(user: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}): string {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Yapper"
  );
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Subscribe to auth state changes. Returns the unsubscribe function. */
export function onAuthStateChange(
  callback: (user: { id: string; email?: string } | null) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

/** Save a completed session to the DB. Fire-and-forget — never throws. */
export async function saveSession(payload: {
  userId: string;
  mode: string;
  prompt: string;
  category: string;
  transcript: string;
  durationSec: number;
  wpm: number;
  wordCount: number;
  clarityScore: number;
  flowScore: number;
  presenceScore: number;
  grammarScore: number;
  contentScore?: number;
  verdict?: string;
  strengths?: string[];
  weaknesses?: string[];
  counterPoints?: string[];
  betterAngle?: string;
  idealRewrite?: string;
}): Promise<void> {
  try {
    const overallScore =
      payload.contentScore != null
        ? Math.round(
            (payload.clarityScore +
              payload.flowScore +
              payload.presenceScore +
              payload.grammarScore +
              payload.contentScore) /
              5
          )
        : Math.round(
            (payload.clarityScore +
              payload.flowScore +
              payload.presenceScore +
              payload.grammarScore) /
              4
          );

    const { error, data, status } = await supabase.from("sessions").insert({
      user_id: payload.userId,
      mode: payload.mode,
      prompt: payload.prompt,
      category: payload.category,
      transcript: payload.transcript,
      duration_sec: payload.durationSec,
      wpm: payload.wpm,
      word_count: payload.wordCount,
      clarity_score: payload.clarityScore,
      flow_score: payload.flowScore,
      presence_score: payload.presenceScore,
      grammar_score: payload.grammarScore,
      content_score: payload.contentScore ?? null,
      overall_score: overallScore,
      verdict: payload.verdict ?? null,
      strengths: payload.strengths ?? [],
      weaknesses: payload.weaknesses ?? [],
      counter_points: payload.counterPoints ?? [],
      better_angle: payload.betterAngle ?? null,
      ideal_rewrite: payload.idealRewrite ?? null,
    }).select(); // Select to check if data is actually returned

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(error.message);
    }
  } catch (e) {
    // Non-blocking — user still sees results even if DB save fails
    console.error("Session save failed:", e);
  }
}

const PENDING_SESSION_KEY = "yappr.pending_session";

/** Store a session payload in localStorage to survive a page reload. */
export function storePendingSession(payload: Parameters<typeof saveSession>[0]): void {
  try {
    // Remove userId before storing — we'll fill it in after auth
    const { userId: _, ...rest } = payload;
    localStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(rest));
  } catch (e) {
  }
}

/** Read and clear any pending session from localStorage. */
export function popPendingSession(): Omit<Parameters<typeof saveSession>[0], "userId"> | null {
  try {
    const raw = localStorage.getItem(PENDING_SESSION_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_SESSION_KEY);
    return JSON.parse(raw);
  } catch (e) { 
    return null; 
  }
}
