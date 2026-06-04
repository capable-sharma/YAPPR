import { useState } from "react";

export interface YapprUser { name: string; email: string }

export function AuthModal({ onSubmit }: { onSubmit: (u: YapprUser) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const m = email.trim();
    if (n.length < 2) return setErr("Add your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return setErr("Valid email please.");
    try { localStorage.setItem("yappr.user", JSON.stringify({ name: n, email: m })); } catch { /* */ }
    try { window.dispatchEvent(new Event("yappr-user-change")); } catch { /* */ }
    onSubmit({ name: n, email: m });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-paper brutal-border-thick brutal-shadow-lg p-6 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-yappr-magenta text-paper font-display text-2xl px-3 py-1 brutal-border">UNLOCK</div>
          <div className="font-mono text-xs uppercase tracking-widest">Score gate</div>
        </div>
        <h2 className="font-display text-4xl leading-none">Your run is in.<br/>Drop your name.</h2>
        <p className="font-mono text-xs text-muted-foreground">
          We need this once. No spam. Your audio was already deleted.
        </p>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
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
            className="brutal-border bg-paper px-3 py-2 font-mono text-base focus:outline-none focus:bg-yappr-yellow"
            placeholder="you@iitb.ac.in"
          />
        </label>
        {err && <div className="bg-destructive text-destructive-foreground px-3 py-2 font-mono text-sm brutal-border">{err}</div>}
        <button
          type="submit"
          className="bg-ink text-paper brutal-border brutal-shadow brutal-press font-display text-3xl py-3 tracking-wide"
        >
          SHOW MY SCORE →
        </button>
      </form>
    </div>
  );
}
