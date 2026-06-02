import { FRAMEWORKS } from "@/lib/yappr-data";
import { useState } from "react";

export function FrameworkAccordion() {
  const [open, setOpen] = useState<string | null>("star");
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-2xl">Framework Chest</h3>
      {FRAMEWORKS.map((f) => {
        const isOpen = open === f.id;
        return (
          <div key={f.id} className="brutal-border brutal-shadow-sm bg-paper">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : f.id)}
              className={`w-full flex items-center justify-between px-4 py-3 ${f.color} ${f.id !== "star" ? "text-paper" : ""} font-display text-2xl border-b-4 border-ink`}
            >
              <span>{f.name}</span>
              <span className="font-mono text-xl">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="p-4 flex flex-col gap-2">
                {f.steps.map((s, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-9 h-9 bg-ink text-paper font-display text-xl flex items-center justify-center shrink-0">
                      {s.k}
                    </div>
                    <div>
                      <div className="font-display text-lg leading-none mt-1">{s.t}</div>
                      <div className="font-mono text-xs text-muted-foreground">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
