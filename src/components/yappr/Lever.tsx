import { useEffect, useRef, useState } from "react";

interface LeverProps {
  onPull: () => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Vertical mechanical lever. User drags handle from top to bottom threshold
 * (touch or mouse). When released past threshold, fires onPull.
 */
export function Lever({ onPull, disabled, label = "PULL" }: LeverProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0); // 0..1
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const rel = (clientY - rect.top - 32) / (rect.height - 64);
      setY(Math.max(0, Math.min(1, rel)));
    };
    const mm = (e: MouseEvent) => onMove(e.clientY);
    const tm = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientY); };
    const end = () => {
      setDragging(false);
      if (y > 0.85 && !disabled) {
        onPull();
      }
      setTimeout(() => setY(0), 220);
    };
    window.addEventListener("mousemove", mm);
    window.addEventListener("touchmove", tm, { passive: false });
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
    };
  }, [dragging, y, disabled, onPull]);

  // Click-to-pull fallback (accessibility / desktop convenience)
  const clickPull = () => {
    if (disabled) return;
    setY(1);
    setTimeout(() => { onPull(); setY(0); }, 180);
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="font-display text-xs tracking-widest">{label}</div>
      <div
        ref={trackRef}
        className="relative w-16 h-64 bg-yappr-yellow brutal-border brutal-shadow"
        aria-disabled={disabled}
      >
        {/* track slots */}
        <div className="absolute inset-x-3 top-3 bottom-3 bg-ink/10 border-2 border-ink" />
        {/* handle */}
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); setDragging(true); }}
          onTouchStart={(e) => { e.preventDefault(); setDragging(true); }}
          onClick={clickPull}
          className="absolute left-1/2 -translate-x-1/2 w-14 h-14 bg-yappr-magenta brutal-border brutal-shadow-sm cursor-grab active:cursor-grabbing disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-display text-paper text-2xl"
          style={{
            top: `${8 + y * (256 - 64 - 16)}px`,
            transition: dragging ? "none" : "top 220ms cubic-bezier(.2,.8,.2,1)",
          }}
          aria-label="Pull the lever"
        >
          ↓
        </button>
      </div>
      <div className="font-mono text-[10px] uppercase opacity-70">drag down</div>
    </div>
  );
}
