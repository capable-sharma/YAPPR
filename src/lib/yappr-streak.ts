// Frontend-only mock for the YAPPR Lock-in challenges.
// All data lives in localStorage. No real money moves.

const KEY_BASE = "yappr.streak.v2";

/** Scope streak to the signed-in user so logging in with a fresh account
 *  doesn't inherit someone else's plan/forfeit state. */
function KEY(): string {
  if (typeof window === "undefined") return `${KEY_BASE}.anon`;
  try {
    const raw = localStorage.getItem("yappr.user");
    if (!raw) return `${KEY_BASE}.anon`;
    const u = JSON.parse(raw) as { email?: string };
    return `${KEY_BASE}.${(u?.email || "anon").toLowerCase()}`;
  } catch { return `${KEY_BASE}.anon`; }
}

export type StreakPlan = "free" | "p49" | "p99";

export interface PlanConfig {
  id: StreakPlan;
  label: string;
  amount: number; // INR
  days: number;
  refundable: boolean;
  unlocksIdealRewrite: boolean;
  blurb: string;
  perks: string[];
}

export const PLANS: Record<StreakPlan, PlanConfig> = {
  free: {
    id: "free",
    label: "Free Yapper",
    amount: 0,
    days: 0,
    refundable: false,
    unlocksIdealRewrite: false,
    blurb: "Just sign in. Forge your voice.",
    perks: [
      "Unlimited 60s topic & vocab takes",
      "60s impromptu + debate mode",
      "Quad-Pillar delivery score",
      "Personal session history",
    ],
  },
  p49: {
    id: "p49",
    label: "14-Day Lock-in",
    amount: 99,
    days: 14,
    refundable: false,
    unlocksIdealRewrite: true,
    blurb: "14 days pure lock in @just 99.",
    perks: [
      "Everything in Free",
      "Interview Prep Unlocked",
      "Ideal Rewrite and Points to consider",
      "14-day discipline ladder",
    ],
  },
  p99: {
    id: "p99",
    label: "30-Day Lock-in",
    amount: 149,
    days: 30,
    refundable: true,
    unlocksIdealRewrite: true,
    blurb: "₹149 deposit. Finish 30/30 → 100% refund.",
    perks: [
      "Everything in 14-Day",
      "100% refund on full 30-day streak",
      "All Upcoming Pro Updates",
      "YAPPR Hall of Streaks entry",
    ],
  },
};

export interface StreakState {
  plan: StreakPlan | null;
  deposited: boolean;
  depositTs: number | null;
  refunded: boolean;
  refundTs: number | null;
  startDate: string | null;
  completedDates: string[];
}

const EMPTY: StreakState = {
  plan: null,
  deposited: false,
  depositTs: null,
  refunded: false,
  refundTs: null,
  startDate: null,
  completedDates: [],
};

/** IST yyyy-mm-dd for a given Date (default = now). */
export function istDateKey(d: Date = new Date()): string {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  const ist = new Date(utcMs + 5.5 * 60 * 60_000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadStreak(): StreakState {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(KEY());
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function save(s: StreakState) {
  try { localStorage.setItem(KEY(), JSON.stringify(s)); } catch { /* */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yappr-streak-change"));
  }
}

export function activatePlan(plan: StreakPlan): StreakState {
  const today = istDateKey();
  const cfg = PLANS[plan];
  const s: StreakState = {
    ...EMPTY,
    plan,
    deposited: cfg.amount > 0,
    depositTs: cfg.amount > 0 ? Date.now() : null,
    startDate: cfg.days > 0 ? today : null,
    completedDates: [],
  };
  save(s);
  return s;
}

export function markTodayComplete(): StreakState {
  const s = loadStreak();
  if (!s.plan || s.refunded) return s;
  const today = istDateKey();
  if (s.completedDates.includes(today)) return s;
  const next: StreakState = {
    ...s,
    completedDates: [...s.completedDates, today].sort(),
  };
  save(next);
  return next;
}

export function refundMock(): StreakState {
  const s = loadStreak();
  if (!isComplete(s)) return s;
  const next: StreakState = { ...s, refunded: true, refundTs: Date.now() };
  save(next);
  return next;
}

export function resetStreak(): StreakState {
  save({ ...EMPTY });
  return { ...EMPTY };
}

export function getChallengeDays(startDate: string, days: number): string[] {
  const out: string[] = [];
  const [y, m, d] = startDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
  for (let i = 0; i < days; i++) {
    const dt = new Date(base.getTime() + i * 24 * 60 * 60_000);
    out.push(istDateKey(dt));
  }
  return out;
}

export function getProgress(s: StreakState): {
  done: number;
  target: number;
  todayDone: boolean;
  daysInWindow: string[];
  brokenOn: string | null;
} {
  if (!s.plan || !s.startDate) {
    return { done: 0, target: 0, todayDone: false, daysInWindow: [], brokenOn: null };
  }
  const target = PLANS[s.plan].days;
  const days = getChallengeDays(s.startDate, target);
  const today = istDateKey();
  const setDone = new Set(s.completedDates);
  let brokenOn: string | null = null;
  for (const d of days) {
    if (d >= today) break;
    if (!setDone.has(d)) { brokenOn = d; break; }
  }
  const done = days.filter((d) => setDone.has(d)).length;
  return { done, target, todayDone: setDone.has(today), daysInWindow: days, brokenOn };
}

export function isComplete(s: StreakState): boolean {
  if (!s.plan) return false;
  const p = getProgress(s);
  return p.target > 0 && !p.brokenOn && p.done >= p.target;
}

/** Does the current plan unlock the AI Ideal Rewrite block? */
export function hasIdealRewrite(s: StreakState): boolean {
  // Beta — all features free. Revert to plan check when payments go live.
  return true;
}
