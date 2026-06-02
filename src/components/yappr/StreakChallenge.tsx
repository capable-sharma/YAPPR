import { useEffect, useState } from "react";
import {
  loadStreak, depositMock, refundMock, resetStreak,
  getProgress, isComplete, STREAK_CONFIG, istDateKey,
  type StreakState,
} from "@/lib/yappr-streak";

export function StreakChallenge() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<StreakState>(() => loadStreak());
  const [showCheckout, setShowCheckout] = useState(false);
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

  // SSR-stable shell to avoid hydration mismatch.
  if (!mounted) {
    return (
      <div className="brutal-border bg-ink text-paper p-4">
        <div className="font-mono text-[10px] uppercase opacity-70">The 30-Day Lock-in</div>
        <div className="font-display text-2xl leading-tight mt-1">
          ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} in. {STREAK_CONFIG.TARGET_DAYS}-day streak. 100% back.
        </div>
      </div>
    );
  }

  const progress = getProgress(state);
  const complete = isComplete(state);

  // ---- Pre-deposit
  if (!state.deposited) {
    return (
      <>
        <div className="brutal-border-thick brutal-shadow-lg bg-ink text-paper p-4">
          <div className="font-mono text-[10px] uppercase opacity-70">The 30-Day Lock-in</div>
          <div className="font-display text-3xl leading-tight mt-1">
            ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} in.<br />30 days.<br />100% back.
          </div>
          <ul className="font-mono text-[11px] mt-3 space-y-1 opacity-90">
            <li>· Pay ₹{STREAK_CONFIG.DEPOSIT_AMOUNT}. Record one session every day.</li>
            <li>· Miss a day → forfeit.</li>
            <li>· Finish 30/30 → instant ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} refund.</li>
          </ul>
          <button
            onClick={() => setShowCheckout(true)}
            className="mt-4 w-full bg-yappr-yellow text-ink brutal-border brutal-shadow brutal-press font-display text-2xl py-2"
          >
            LOCK IN ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} →
          </button>
          <div className="font-mono text-[10px] mt-2 opacity-60">
            Demo · No real charge. Refund is simulated.
          </div>
        </div>
        {showCheckout && (
          <CheckoutModal
            onCancel={() => setShowCheckout(false)}
            onPay={() => { depositMock(); setShowCheckout(false); }}
          />
        )}
      </>
    );
  }

  // ---- Refunded
  if (state.refunded) {
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-green p-4">
        <div className="font-mono text-[10px] uppercase">Challenge complete</div>
        <div className="font-display text-3xl leading-tight mt-1">REFUNDED ✓</div>
        <div className="font-mono text-[11px] mt-2">
          ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} returned to source. You are now in the YAPPR Hall of Streaks.
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

  // ---- Broken streak (forfeited)
  if (progress.brokenOn) {
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-magenta text-paper p-4">
        <div className="font-mono text-[10px] uppercase">Streak broken</div>
        <div className="font-display text-3xl leading-tight mt-1">FORFEITED</div>
        <div className="font-mono text-[11px] mt-2 opacity-90">
          You missed <b>{progress.brokenOn}</b>. ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} deposit is non-refundable.
          Reset to start a new 30-day attempt.
        </div>
        <div className="mt-3 grid grid-cols-10 gap-1">
          {progress.daysInWindow.map((d) => {
            const done = state.completedDates.includes(d);
            const missed = d === progress.brokenOn;
            return (
              <div
                key={d}
                title={d}
                className={[
                  "h-4 brutal-border",
                  done ? "bg-yappr-green" : missed ? "bg-ink" : "bg-paper/40",
                ].join(" ")}
              />
            );
          })}
        </div>
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
  return (
    <>
      <div className="brutal-border-thick brutal-shadow-lg bg-ink text-paper p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase opacity-70">Lock-in active</div>
          <div className="font-mono text-[10px] opacity-70">IST · {today}</div>
        </div>
        <div className="font-display text-4xl leading-none mt-1">
          {progress.done}<span className="opacity-50">/{progress.target}</span>
        </div>
        <div className="font-mono text-[11px] mt-1 opacity-80">
          {progress.todayDone
            ? "Today logged ✓ — come back tomorrow."
            : "Record one session today to keep the streak."}
        </div>

        <div className="mt-3 grid grid-cols-10 gap-1">
          {progress.daysInWindow.map((d, i) => {
            const done = state.completedDates.includes(d);
            const isToday = d === today;
            const future = d > today;
            return (
              <div
                key={d}
                title={`Day ${i + 1} · ${d}`}
                className={[
                  "h-5 brutal-border flex items-center justify-center font-mono text-[8px]",
                  done ? "bg-yappr-green text-ink"
                       : isToday ? "bg-yappr-yellow text-ink animate-pulse"
                       : future ? "bg-paper/10"
                       : "bg-yappr-magenta/70",
                ].join(" ")}
              >
                {done ? "✓" : isToday ? "•" : ""}
              </div>
            );
          })}
        </div>

        {complete ? (
          <button
            onClick={() => setShowRefund(true)}
            className="mt-4 w-full bg-yappr-green text-ink brutal-border brutal-shadow brutal-press font-display text-2xl py-2"
          >
            CLAIM ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} REFUND →
          </button>
        ) : (
          <div className="font-mono text-[10px] mt-3 opacity-60">
            Deposit ₹{STREAK_CONFIG.DEPOSIT_AMOUNT} · Refund auto-issues at 30/30.
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
          onClose={() => setShowRefund(false)}
          onConfirm={() => { refundMock(); setShowRefund(false); }}
        />
      )}
    </>
  );
}

/* ------------------------- Modals ------------------------- */

function CheckoutModal({ onPay, onCancel }: { onPay: () => void; onCancel: () => void }) {
  const [processing, setProcessing] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="brutal-border-thick brutal-shadow-lg bg-paper max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] uppercase opacity-60">Mock checkout · UPI</div>
        <div className="font-display text-3xl mt-1">PAY ₹{STREAK_CONFIG.DEPOSIT_AMOUNT}</div>
        <div className="font-mono text-xs mt-2 leading-relaxed">
          This is a demo. No real payment is processed. Clicking PAY will start your 30-day streak.
        </div>
        <div className="brutal-border mt-3 p-3 bg-yappr-yellow font-mono text-xs">
          <div className="flex justify-between"><span>Deposit</span><b>₹{STREAK_CONFIG.DEPOSIT_AMOUNT}.00</b></div>
          <div className="flex justify-between"><span>Refund on 30/30</span><b>₹{STREAK_CONFIG.DEPOSIT_AMOUNT}.00</b></div>
          <div className="flex justify-between border-t-2 border-ink mt-2 pt-2"><span>Net cost</span><b>₹0</b></div>
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
            onClick={() => {
              setProcessing(true);
              setTimeout(onPay, 800);
            }}
            className="flex-1 bg-yappr-green text-ink brutal-border brutal-shadow brutal-press font-display text-xl py-2"
          >
            {processing ? "PROCESSING..." : "PAY ₹99"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const [processing, setProcessing] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="brutal-border-thick brutal-shadow-lg bg-yappr-green max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] uppercase">30/30 Verified</div>
        <div className="font-display text-3xl mt-1">REFUND ₹{STREAK_CONFIG.DEPOSIT_AMOUNT}</div>
        <div className="font-mono text-xs mt-2 leading-relaxed">
          You spoke for 30 consecutive days. Click to release the deposit back to your source.
        </div>
        <button
          disabled={processing}
          onClick={() => { setProcessing(true); setTimeout(onConfirm, 800); }}
          className="mt-4 w-full bg-ink text-paper brutal-border brutal-shadow brutal-press font-display text-2xl py-2"
        >
          {processing ? "REFUNDING..." : "RELEASE ₹99"}
        </button>
      </div>
    </div>
  );
}
