import type { Tab } from "@/lib/yappr-data";

const TABS: { id: Tab; label: string; emoji: string; color: string }[] = [
  { id: "topics", label: "Impromptu", emoji: "🎯", color: "bg-yappr-yellow" },
  { id: "interview", label: "Interview Prep", emoji: "💼", color: "bg-yappr-blue text-paper" },
  { id: "vocab", label: "WordBuzz", emoji: "⚡", color: "bg-yappr-magenta text-paper" },
];

export function TabSwitcher({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex brutal-border brutal-shadow bg-paper p-1 gap-1 w-full md:w-auto">
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={[
              "flex-1 md:flex-none px-2 md:px-4 py-2 font-display text-[13px] md:text-xl tracking-wide whitespace-nowrap brutal-press flex items-center justify-center gap-1.5 min-w-0",
              active ? `${t.color} brutal-border` : "bg-transparent text-ink hover:bg-muted",
            ].join(" ")}
          >
            <span aria-hidden className="text-sm md:text-base">{t.emoji}</span>
            <span className="truncate">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
