import { useState } from "react";
import { sendMagicLink } from "@/lib/yappr-auth";

// YapprUser kept exported — SessionEngine still imports this type
export interface YapprUser { name: string; email: string }

interface AuthModalProps {
  onSubmit: (u: YapprUser) => void;
  onClose?: () => void;
  variant?: "signup" | "gate";
}

export function AuthModal({ onSubmit, onClose, variant = "gate" }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSignup = variant === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return setErr("Valid email please.");
    if (m.length > 200) return setErr("Email too long.");
    const n = name.trim();
    if (n.length < 2) return setErr("Add your name.");
    if (n.length > 80) return setErr("Name too long.");
    setErr("");
    setLoading(true);
    const error = await sendMagicLink(m);
    setLoading(false);
    if (error) {
      setErr(error);
      return;
    }
    // Persist locally so SessionEngine can proceed immediately
    try {
      localStorage.setItem("yappr.user", JSON.stringify({ name: n, email: m }));
      window.dispatchEvent(new Event("yappr-user-change"));
    } catch { /* */ }
    setSent(true);
    // Unblock the session immediately — results show now, link arrives in email
    onSubmit({ name: n, email: m });
  };

  // Confirmation screen shown after magic link is sent
  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-yappr-green brutal-border-thick brutal-shadow-lg p-6 flex flex-col gap-4 animate-pop-in">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute -top-3 -right-3 bg-ink text-paper brutal-border brutal-press w-9 h-9 flex items-center justify-center font-display text-2xl leading-none"
            >
              ×
            </button>
          )}
          <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">
            Check your inbox
          </div>
          <h2 className="font-display text-4xl leading-none">
            Link sent.<br />Go tap it.
          </h2>
          <p className="font-mono text-xs opacity-70">
            We sent a magic link to <b>{email}</b>. Click it to lock in your
            account — your scores are already showing below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-paper brutal-border-thick brutal-shadow-lg p-6 flex flex-col gap-4 animate-pop-in"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -top-3 -right-3 bg-ink text-paper brutal-border brutal-press w-9 h-9 flex items-center justify-center font-display text-2xl leading-none"
          >
            ×
          </button>
        )}

        {isSignup ? (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-yappr-blue text-paper font-display text-2xl px-3 py-1 brutal-border">
                YAPPR
              </div>
            </div>
            <h2 className="font-display text-4xl leading-none">
              Get in. Start yapping.
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              Drop your email. We send a magic link — no password ever.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-yappr-magenta text-paper font-display text-2xl px-3 py-1 brutal-border">
                UNLOCK
              </div>
              <div className="font-mono text-xs uppercase tracking-widest">
                Score gate
              </div>
            </div>
            <h2 className="font-display text-4xl leading-none">
              Your run is in.<br />Drop your email.
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              We send a magic link — no password. Your audio was already deleted.
            </p>
          </>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={80}
            className="brutal-border bg-paper px-3 py-2 font-display text-2xl focus:outline-none focus:bg-yappr-yellow"
            placeholder="Aanya Sharma"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            className="brutal-border bg-paper px-3 py-2 font-mono text-base focus:outline-none focus:bg-yappr-yellow"
            placeholder="you@gmail.com"
          />
        </label>

        {err && (
          <div className="bg-destructive text-destructive-foreground px-3 py-2 font-mono text-sm brutal-border">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-ink text-paper brutal-border brutal-shadow brutal-press font-display text-3xl py-3 tracking-wide disabled:opacity-50"
        >
          {loading ? "SENDING..." : isSignup ? "SEND LINK →" : "SHOW MY SCORE →"}
        </button>
      </form>
    </div>
  );
}
