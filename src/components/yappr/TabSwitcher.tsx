import type { Tab } from "@/lib/yappr-data";

const TABS: { id: Tab; label: string; emoji: string; color: string }[] = [
  { id: "topics", label: "Impromptu", emoji: "🎯", color: "bg-yappr-yellow" },
  { id: "interview", label: "Interview Prep", emoji: "💼", color: "bg-yappr-blue text-paper" },
  { id: "vocab", label: "WordBuzz", emoji: "⚡", color: "bg-yappr-magenta text-paper" },
];

export function TabSwitcher({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex brutal-border brutal-shadow bg-paper p-1 gap-1 max-w-full overflow-x-auto snap-x">
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={[
              "px-3 md:px-4 py-2 font-display text-base md:text-xl tracking-wide whitespace-nowrap brutal-press snap-start flex items-center gap-1.5",
              active ? `${t.color} brutal-border` : "bg-transparent text-ink hover:bg-muted",
            ].join(" ")}
          >
            <span aria-hidden>{t.emoji}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
