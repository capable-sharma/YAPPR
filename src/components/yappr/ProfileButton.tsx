import { useEffect, useRef, useState } from "react";
import { AuthModal, type YapprUser } from "./AuthModal";

function readUser(): YapprUser | null {
  try {
    const raw = localStorage.getItem("yappr.user");
    return raw ? (JSON.parse(raw) as YapprUser) : null;
  } catch {
    return null;
  }
}

export function ProfileButton() {
  const [user, setUser] = useState<YapprUser | null>(null);
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(readUser());
    const onChange = () => setUser(readUser());
    window.addEventListener("yappr-user-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("yappr-user-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const logout = () => {
    try {
      localStorage.removeItem("yappr.user");
    } catch { /* */ }
    window.dispatchEvent(new Event("yappr-user-change"));
    setOpen(false);
  };

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="brutal-border brutal-press bg-ink text-paper font-display text-base md:text-lg px-3 py-2 tracking-wide hover-wobble"
        >
          SIGN IN →
        </button>
        {showAuth && (
          <AuthModal onSubmit={(u) => { setUser(u); setShowAuth(false); }} />
        )}
      </>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="brutal-border brutal-press bg-ink text-paper w-10 h-10 md:w-11 md:h-11 flex items-center justify-center font-display text-lg hover-wobble"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${user.name} · ${user.email}`}
      >
        {initials || "Y"}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 bg-paper brutal-border-thick brutal-shadow-lg p-3 flex flex-col gap-2 z-50 animate-pop-in"
        >
          <div className="font-mono text-[10px] uppercase opacity-60">Signed in</div>
          <div className="font-display text-2xl leading-none">{user.name}</div>
          <div className="font-mono text-xs break-all opacity-80">{user.email}</div>
          <div className="h-px bg-ink my-1" />
          <button
            type="button"
            onClick={logout}
            className="bg-yappr-magenta text-paper brutal-border brutal-press font-display text-xl py-2"
          >
            LOG OUT →
          </button>
        </div>
      )}
    </div>
  );
}
