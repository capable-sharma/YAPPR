import { useEffect, useRef, useState } from "react";

export function CountdownTimer({
  seconds,
  variant,
  onDone,
  onTick,
}: {
  seconds: number;
  variant: "prep" | "record";
  onDone: () => void;
  onTick?: (remaining: number) => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const cb = useRef(onDone);
  const tcb = useRef(onTick);
  cb.current = onDone;
  tcb.current = onTick;

  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        tcb.current?.(next);
        if (next <= 0) {
          clearInterval(id);
          cb.current();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const pct = (remaining / seconds) * 100;
  const bg = variant === "prep" ? "bg-yappr-yellow" : "bg-yappr-magenta text-paper";

  return (
    <div className={`brutal-border brutal-shadow ${bg} px-4 py-3 font-display text-4xl md:text-5xl tracking-wider flex items-center justify-between gap-4`}>
      <span className="font-mono text-xs tracking-widest uppercase opacity-80">
        {variant === "prep" ? "Think" : "Speak"}
      </span>
      <span>{String(remaining).padStart(2, "0")}s</span>
      <div className="hidden md:block w-32 h-3 bg-ink/20 border-2 border-ink">
        <div className="h-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
