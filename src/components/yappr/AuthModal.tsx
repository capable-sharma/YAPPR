import { useState, useEffect, useRef } from "react";
import { signInWithIdToken } from "@/lib/yappr-auth";

export interface YapprUser { name: string; email: string }

interface AuthModalProps {
  onSubmit: (u: YapprUser) => void;
  onClose?: () => void;
  variant?: "signup" | "gate";
}

export function AuthModal({ onSubmit, onClose, variant = "gate" }: AuthModalProps) {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSignup = variant === "signup";

  useEffect(() => {
    // Prevent double injection in StrictMode
    if (document.getElementById("google-gsi-script")) return;

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google && containerRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            setLoading(true);
            setErr("");
            try {
              const u = await signInWithIdToken(response.credential);
              // Save locally so the session engine has it instantly
              localStorage.setItem("yappr.user", JSON.stringify(u));
              window.dispatchEvent(new Event("yappr-user-change"));
              onSubmit(u); // unblocks the UI!
            } catch (error: any) {
              setErr(error.message || "Failed to sign in");
              setLoading(false);
            }
          },
        });
        (window as any).google.accounts.id.renderButton(
          containerRef.current,
          { theme: "filled_black", size: "large", type: "standard", shape: "rectangular" }
        );
      }
    };
    document.body.appendChild(script);
  }, [onSubmit]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
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
              Sign in with Google. No passwords ever.
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
              Your run is in.<br />Sign in to view.
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              Sign in with Google. Your audio was already deleted.
            </p>
          </>
        )}

        {err && (
          <div className="bg-destructive text-destructive-foreground px-3 py-2 font-mono text-sm brutal-border">
            {err}
          </div>
        )}

        <div className="flex justify-center mt-2" ref={containerRef}>
          {/* Google Button Renders Here */}
        </div>

        {loading && (
          <p className="text-center font-mono text-xs uppercase opacity-70 mt-2">
            Connecting...
          </p>
        )}
      </div>
    </div>
  );
}
