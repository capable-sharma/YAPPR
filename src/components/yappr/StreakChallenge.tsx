import { useEffect, useState } from "react";
import {
  loadStreak, activatePlan, refundMock, resetStreak,
  getProgress, isComplete, PLANS, istDateKey,
  type StreakState, type StreakPlan,
} from "@/lib/yappr-streak";

export function StreakChallenge() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<StreakState>(() => loadStreak());
  const [checkoutFor, setCheckoutFor] = useState<StreakPlan | null>(null);
  const [showRefund, setShowRefund] = useState(false);

  useEffect(() => {
    setMounted(true);
    setState(loadStreak());
    const onChange = () => setState(loadStreak());
    window.addEventListener("yappr-streak-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("yappr-streak-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="brutal-border bg-ink text-paper p-4">
        <div className="font-mono text-[10px] uppercase opacity-70">Pick your tier</div>
        <div className="font-display text-2xl leading-tight mt-1">FREE · ₹49 · ₹99</div>
      </div>
    );
  }

  // ---- No plan picked yet -> 3-tier picker
  if (!state.plan) {
    return (
      <>
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[10px] uppercase opacity-60 px-1">Pick your tier</div>
          <PlanCard
            plan={PLANS.free}
            accent="bg-paper"
            ctaLabel="START FREE"
            onPick={() => { activatePlan("free"); setState(loadStreak()); }}
          />
          <PlanCard
            plan={PLANS.p49}
            accent="bg-yappr-blue text-paper"
            ctaLabel="LOCK ₹49 · 7 DAYS"
            highlight="Most picked"
            onPick={() => setCheckoutFor("p49")}
          />
          <PlanCard
            plan={PLANS.p99}
            accent="bg-ink text-paper"
            ctaLabel="LOCK ₹99 · 30 DAYS"
            highlight="100% refund"
            onPick={() => setCheckoutFor("p99")}
          />
        </div>
        {checkoutFor && (
          <CheckoutModal
            plan={checkoutFor}
            onCancel={() => setCheckoutFor(null)}
            onPay={() => { activatePlan(checkoutFor); setCheckoutFor(null); setState(loadStreak()); }}
          />
        )}
      </>
    );
  }

  const cfg = PLANS[state.plan];

  // ---- Free tier: active, no streak window
  if (state.plan === "free") {
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-paper p-4">
        <div className="font-mono text-[10px] uppercase opacity-60">Free tier · active</div>
        <div className="font-display text-2xl leading-tight mt-1">YAPPR FREE</div>
        <ul className="font-mono text-[11px] mt-2 space-y-1">
          {cfg.perks.map((p) => <li key={p}>· {p}</li>)}
        </ul>
        <div className="font-mono text-[10px] mt-3 opacity-70">
          Want the Ideal Rewrite script after every take? Upgrade.
        </div>
        <button
          onClick={() => { resetStreak(); setState(loadStreak()); }}
          className="mt-3 bg-yappr-yellow text-ink brutal-border brutal-press font-display text-lg px-3 py-1.5"
        >
          UPGRADE →
        </button>
      </div>
    );
  }

  const progress = getProgress(state);
  const complete = isComplete(state);

  // ---- Refunded (p99 only)
  if (state.refunded) {
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-green p-4">
        <div className="font-mono text-[10px] uppercase">Challenge complete</div>
        <div className="font-display text-3xl leading-tight mt-1">REFUNDED ✓</div>
        <div className="font-mono text-[11px] mt-2">
          ₹{cfg.amount} returned. You're in the YAPPR Hall of Streaks.
        </div>
        <button
          onClick={() => { resetStreak(); setState(loadStreak()); }}
          className="mt-3 bg-ink text-paper brutal-border brutal-press font-display text-lg px-3 py-1.5"
        >
          GO AGAIN
        </button>
      </div>
    );
  }

  // ---- Broken streak
  if (progress.brokenOn) {
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-magenta text-paper p-4">
        <div className="font-mono text-[10px] uppercase">Streak broken</div>
        <div className="font-display text-3xl leading-tight mt-1">FORFEITED</div>
        <div className="font-mono text-[11px] mt-2 opacity-90">
          You missed <b>{progress.brokenOn}</b>. ₹{cfg.amount} deposit is non-refundable.
        </div>
        <ProgressGrid days={progress.daysInWindow} done={state.completedDates} brokenOn={progress.brokenOn} cols={cfg.days >= 30 ? 10 : 7} />
        <button
          onClick={() => { resetStreak(); setState(loadStreak()); }}
          className="mt-3 bg-ink text-paper brutal-border brutal-press font-display text-lg px-3 py-1.5"
        >
          RESTART
        </button>
      </div>
    );
  }

  // ---- Active
  const today = istDateKey();
  const refundable = cfg.refundable;
  return (
    <>
      <div className="brutal-border-thick brutal-shadow-lg bg-ink text-paper p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase opacity-70">{cfg.label} · active</div>
          <div className="font-mono text-[10px] opacity-70">IST · {today}</div>
        </div>
        <div className="font-display text-4xl leading-none mt-1">
          {progress.done}<span className="opacity-50">/{progress.target}</span>
        </div>
        <div className="font-mono text-[11px] mt-1 opacity-80">
          {progress.todayDone
            ? "Today logged ✓ — come back tomorrow."
            : "Record one 45s+ session today."}
        </div>

        <ProgressGrid days={progress.daysInWindow} done={state.completedDates} today={today} cols={cfg.days >= 30 ? 10 : 7} />

        {complete && refundable ? (
          <button
            onClick={() => setShowRefund(true)}
            className="mt-4 w-full bg-yappr-green text-ink brutal-border brutal-shadow brutal-press font-display text-2xl py-2"
          >
            CLAIM ₹{cfg.amount} REFUND →
          </button>
        ) : complete ? (
          <div className="mt-3 brutal-border bg-yappr-green text-ink p-3 font-display text-xl">
            ✓ 7/7 DONE — discipline locked.
          </div>
        ) : (
          <div className="font-mono text-[10px] mt-3 opacity-60">
            {refundable
              ? `₹${cfg.amount} refund auto-issues at ${cfg.days}/${cfg.days}.`
              : `₹${cfg.amount} is a motivation deposit — not refundable on completion.`}
          </div>
        )}

        <button
          onClick={() => {
            if (confirm("Reset the challenge? Your deposit will be forfeited.")) {
              resetStreak(); setState(loadStreak());
            }
          }}
          className="mt-2 font-mono text-[10px] underline opacity-60"
        >
          reset challenge
        </button>
      </div>

      {showRefund && (
        <RefundModal
          amount={cfg.amount}
          onClose={() => setShowRefund(false)}
          onConfirm={() => { refundMock(); setShowRefund(false); }}
        />
      )}
    </>
  );
}

/* ------------------------- Sub-components ------------------------- */

function PlanCard({
  plan, accent, ctaLabel, onPick, highlight,
}: {
  plan: typeof PLANS[StreakPlan];
  accent: string;
  ctaLabel: string;
  onPick: () => void;
  highlight?: string;
}) {
  return (
    <div className={`brutal-border-thick brutal-shadow-lg ${accent} p-4 relative`}>
      {highlight && (
        <div className="absolute -top-3 right-3 bg-yappr-yellow text-ink brutal-border font-mono text-[9px] uppercase px-2 py-0.5">
          {highlight}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-display text-2xl leading-none">{plan.label}</div>
        <div className="font-display text-3xl leading-none">₹{plan.amount}</div>
      </div>
      <div className="font-mono text-[11px] mt-2 opacity-90 leading-snug">{plan.blurb}</div>
      <ul className="font-mono text-[11px] mt-2 space-y-0.5 opacity-90">
        {plan.perks.map((p) => <li key={p}>· {p}</li>)}
      </ul>
      <button
        onClick={onPick}
        className="mt-3 w-full bg-yappr-yellow text-ink brutal-border brutal-press font-display text-lg py-2"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function ProgressGrid({
  days, done, today, brokenOn, cols,
}: {
  days: string[];
  done: string[];
  today?: string;
  brokenOn?: string | null;
  cols: number;
}) {
  return (
    <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {days.map((d, i) => {
        const isDone = done.includes(d);
        const isToday = d === today;
        const isMissed = d === brokenOn;
        const future = today ? d > today : false;
        return (
          <div
            key={d}
            title={`Day ${i + 1} · ${d}`}
            className={[
              "h-5 brutal-border flex items-center justify-center font-mono text-[8px]",
              isDone ? "bg-yappr-green text-ink"
                     : isMissed ? "bg-paper/30"
                     : isToday ? "bg-yappr-yellow text-ink animate-pulse"
                     : future ? "bg-paper/10"
                     : "bg-yappr-magenta/70",
            ].join(" ")}
          >
            {isDone ? "✓" : isToday ? "•" : ""}
          </div>
        );
      })}
    </div>
  );
}

function CheckoutModal({
  plan, onPay, onCancel,
}: { plan: StreakPlan; onPay: () => void; onCancel: () => void }) {
  const cfg = PLANS[plan];
  const [processing, setProcessing] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="brutal-border-thick brutal-shadow-lg bg-paper max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] uppercase opacity-60">Mock checkout · UPI</div>
        <div className="font-display text-3xl mt-1">PAY ₹{cfg.amount}</div>
        <div className="font-mono text-xs mt-2 leading-relaxed">
          Demo only — no real charge. Unlocks {cfg.label} ({cfg.days}-day streak).
        </div>
        <div className="brutal-border mt-3 p-3 bg-yappr-yellow font-mono text-xs">
          <div className="flex justify-between"><span>Deposit</span><b>₹{cfg.amount}.00</b></div>
          <div className="flex justify-between">
            <span>{cfg.refundable ? `Refund on ${cfg.days}/${cfg.days}` : "Refundable"}</span>
            <b>{cfg.refundable ? `₹${cfg.amount}.00` : "No"}</b>
          </div>
          <div className="flex justify-between border-t-2 border-ink mt-2 pt-2">
            <span>Net cost if you finish</span>
            <b>{cfg.refundable ? "₹0" : `₹${cfg.amount}`}</b>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-paper brutal-border brutal-press font-display text-xl py-2"
          >
            CANCEL
          </button>
          <button
            disabled={processing}
            onClick={() => { setProcessing(true); setTimeout(onPay, 800); }}
            className="flex-1 bg-yappr-green text-ink brutal-border brutal-shadow brutal-press font-display text-xl py-2"
          >
            {processing ? "PROCESSING..." : `PAY ₹${cfg.amount}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundModal({
  amount, onConfirm, onClose,
}: { amount: number; onConfirm: () => void; onClose: () => void }) {
  const [processing, setProcessing] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="brutal-border-thick brutal-shadow-lg bg-yappr-green max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] uppercase">Streak verified</div>
        <div className="font-display text-3xl mt-1">REFUND ₹{amount}</div>
        <div className="font-mono text-xs mt-2 leading-relaxed">
          You showed up every day. Click to release the deposit back to your source.
        </div>
        <button
          disabled={processing}
          onClick={() => { setProcessing(true); setTimeout(onConfirm, 800); }}
          className="mt-4 w-full bg-ink text-paper brutal-border brutal-shadow brutal-press font-display text-2xl py-2"
        >
          {processing ? "REFUNDING..." : `RELEASE ₹${amount}`}
        </button>
      </div>
    </div>
  );
}
