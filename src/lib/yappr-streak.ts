// Frontend-only mock for the YAPPR 30-Day Lock-in challenge.
// All data lives in localStorage. No real money moves.

const KEY = "yappr.streak.v1";
const DEPOSIT_AMOUNT = 99; // INR
const TARGET_DAYS = 30;

export interface StreakState {
  deposited: boolean;
  depositTs: number | null;     // when ₹99 was "paid"
  refunded: boolean;
  refundTs: number | null;
  startDate: string | null;     // IST yyyy-mm-dd of first deposit day
  completedDates: string[];     // sorted unique IST dates with a valid recording
}

const EMPTY: StreakState = {
  deposited: false,
  depositTs: null,
  refunded: false,
  refundTs: null,
  startDate: null,
  completedDates: [],
};

export const STREAK_CONFIG = { DEPOSIT_AMOUNT, TARGET_DAYS };

/** IST yyyy-mm-dd for a given Date (default = now). */
export function istDateKey(d: Date = new Date()): string {
  // IST is UTC+5:30, no DST
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
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function save(s: StreakState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yappr-streak-change"));
  }
}

export function depositMock(): StreakState {
  const today = istDateKey();
  const s: StreakState = {
    ...EMPTY,
    deposited: true,
    depositTs: Date.now(),
    startDate: today,
    completedDates: [],
  };
  save(s);
  return s;
}

export function markTodayComplete(): StreakState {
  const s = loadStreak();
  if (!s.deposited || s.refunded) return s;
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

/** Returns 30 IST date keys starting from startDate. */
export function getChallengeDays(startDate: string): string[] {
  const out: string[] = [];
  const [y, m, d] = startDate.split("-").map(Number);
  // Build noon-IST anchor to dodge DST/offset edge cases
  const base = new Date(Date.UTC(y, m - 1, d, 6, 30, 0)); // 12:00 IST
  for (let i = 0; i < TARGET_DAYS; i++) {
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
  brokenOn: string | null; // first scheduled past date the user missed
} {
  if (!s.deposited || !s.startDate) {
    return { done: 0, target: TARGET_DAYS, todayDone: false, daysInWindow: [], brokenOn: null };
  }
  const days = getChallengeDays(s.startDate);
  const today = istDateKey();
  const setDone = new Set(s.completedDates);
  let brokenOn: string | null = null;
  for (const d of days) {
    if (d >= today) break;
    if (!setDone.has(d)) { brokenOn = d; break; }
  }
  const done = days.filter((d) => setDone.has(d)).length;
  return {
    done,
    target: TARGET_DAYS,
    todayDone: setDone.has(today),
    daysInWindow: days,
    brokenOn,
  };
}

export function isComplete(s: StreakState): boolean {
  const p = getProgress(s);
  return s.deposited && !p.brokenOn && p.done >= TARGET_DAYS;
}
