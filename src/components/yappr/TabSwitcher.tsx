import type { Tab } from "@/lib/yappr-data";

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: "topics", label: "Random Topics", color: "bg-yappr-yellow" },
  { id: "interview", label: "Interview Prep", color: "bg-yappr-blue text-paper" },
  { id: "vocab", label: "Learn Vocab", color: "bg-yappr-magenta text-paper" },
];

export function TabSwitcher({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex brutal-border brutal-shadow bg-paper p-1 gap-1 max-w-full overflow-x-auto">
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={[
              "px-4 py-2 font-display text-lg md:text-xl tracking-wide whitespace-nowrap brutal-press",
              active ? `${t.color} brutal-border` : "bg-transparent text-ink hover:bg-muted",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
