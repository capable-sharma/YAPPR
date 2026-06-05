import { useState } from "react";

export interface YapprUser { name: string; email: string }

interface AuthModalProps {
  onSubmit: (u: YapprUser) => void;
  /** Optional close handler — when provided, renders a close (×) button. */
  onClose?: () => void;
  /** "signup" = generic signup intro (header trigger). "gate" = post-recording score gate. */
  variant?: "signup" | "gate";
}

export function AuthModal({ onSubmit, onClose, variant = "gate" }: AuthModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const m = email.trim();
    if (n.length < 2) return setErr("Add your name.");
    if (n.length > 80) return setErr("Name too long.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return setErr("Valid email please.");
    if (m.length > 200) return setErr("Email too long.");
    try { localStorage.setItem("yappr.user", JSON.stringify({ name: n, email: m })); } catch { /* */ }
    try { window.dispatchEvent(new Event("yappr-user-change")); } catch { /* */ }
    onSubmit({ name: n, email: m });
  };

  const isSignup = variant === "signup";

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
              <div className="bg-yappr-blue text-paper font-display text-2xl px-3 py-1 brutal-border">YAPPR</div>
              <div className="font-mono text-xs uppercase tracking-widest">Sign up · Log in</div>
            </div>
            <h2 className="font-display text-4xl leading-none">Get in. Start yapping.</h2>
            <p className="font-mono text-xs text-muted-foreground">
              One name, one email. We use it to track your streak and scores. Nothing else.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-yappr-magenta text-paper font-display text-2xl px-3 py-1 brutal-border">UNLOCK</div>
              <div className="font-mono text-xs uppercase tracking-widest">Score gate</div>
            </div>
            <h2 className="font-display text-4xl leading-none">Your run is in.<br/>Drop your name.</h2>
            <p className="font-mono text-xs text-muted-foreground">
              We need this once. No spam. Your audio was already deleted.
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
            placeholder="you@iitb.ac.in"
          />
        </label>
        {err && <div className="bg-destructive text-destructive-foreground px-3 py-2 font-mono text-sm brutal-border">{err}</div>}
        <button
          type="submit"
          className="bg-ink text-paper brutal-border brutal-shadow brutal-press font-display text-3xl py-3 tracking-wide"
        >
          {isSignup ? "LET'S GO →" : "SHOW MY SCORE →"}
        </button>
      </form>
    </div>
  );
}
