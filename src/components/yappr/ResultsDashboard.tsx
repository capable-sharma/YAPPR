import type { AnalysisResult, TranscriptToken } from "@/lib/yappr-analysis";

function ScoreDial({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="brutal-border brutal-shadow bg-paper p-3 flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--ink)" strokeWidth="4" opacity="0.15" />
        <circle
          cx="55" cy="55" r={r}
          fill="none"
          stroke={`var(--${color})`}
          strokeWidth="10"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          strokeLinecap="butt"
        />
        <text x="55" y="62" textAnchor="middle" className="font-display" fontSize="28" fill="var(--ink)">
          {value}
        </text>
      </svg>
      <div className="font-display text-lg uppercase">{label}</div>
    </div>
  );
}

function Token({ t }: { t: TranscriptToken }) {
  if (t.kind === "filler") {
    return <span className="line-through decoration-[var(--yappr-magenta)] decoration-4 text-ink/60">{t.text} </span>;
  }
  if (t.kind === "repeat") {
    return <span className="underline decoration-dotted decoration-yappr-blue underline-offset-4">{t.text} </span>;
  }
  if (t.kind === "grammar") {
    return (
      <span
        className="bg-yappr-blue/20 border-b-2 border-yappr-blue cursor-help relative group"
        title={t.fix ? `→ ${t.fix}` : undefined}
      >
        {t.text}
        {t.fix && (
          <span className="hidden group-hover:block absolute left-0 -top-9 z-10 bg-ink text-paper font-mono text-xs px-2 py-1 whitespace-nowrap brutal-border">
            → {t.fix}
          </span>
        )}
        {" "}
      </span>
    );
  }
  return <span>{t.text} </span>;
}

export function ResultsDashboard({
  result,
  prompt,
  onRetry,
}: {
  result: AnalysisResult;
  prompt: string;
  onRetry: () => void;
}) {
  const { scores, tokens, wpm, wordCount, durationSec, microAction } = result;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest opacity-60">The Breakdown</div>
          <h2 className="font-display text-4xl md:text-5xl leading-none">YOU YAPPED.</h2>
        </div>
        <button
          onClick={onRetry}
          className="bg-yappr-yellow brutal-border brutal-shadow brutal-press font-display text-2xl px-4 py-2"
        >
          PULL AGAIN ↻
        </button>
      </div>

      <div className="brutal-border brutal-shadow bg-paper p-4">
        <div className="font-mono text-[10px] uppercase opacity-60 mb-1">Prompt</div>
        <div className="font-display text-xl">{prompt}</div>
      </div>

      {/* Transcript */}
      <div className="brutal-border brutal-shadow bg-paper p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-2xl">Transcript</div>
          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase">
            <span className="px-2 py-1 bg-yappr-magenta text-paper">filler</span>
            <span className="px-2 py-1 bg-yappr-blue text-paper">grammar (hover)</span>
            <span className="px-2 py-1 bg-ink text-paper">repeat starter</span>
          </div>
        </div>
        <p className="font-mono text-sm md:text-base leading-7 break-words">
          {tokens.length === 0
            ? <span className="opacity-50">No speech detected. Try again with the mic enabled.</span>
            : tokens.map((t, i) => <Token key={i} t={t} />)}
        </p>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreDial label="Clarity" value={scores.clarity} color="yappr-yellow" />
        <ScoreDial label="Structure" value={scores.structure} color="yappr-blue" />
        <ScoreDial label="Presence" value={scores.presence} color="yappr-magenta" />
        <ScoreDial label="Grammar" value={scores.grammar} color="yappr-green" />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="WPM" value={wpm} hint="target 130–160" />
        <Stat label="Words" value={wordCount} />
        <Stat label="Duration" value={`${Math.round(durationSec)}s`} />
      </div>

      {/* Micro-action */}
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-magenta text-paper p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-80">One Micro-Action</div>
        <div className="font-display text-2xl md:text-3xl leading-tight mt-1">{microAction}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="brutal-border bg-paper p-3">
      <div className="font-mono text-[10px] uppercase opacity-60">{label}</div>
      <div className="font-display text-3xl leading-none mt-1">{value}</div>
      {hint && <div className="font-mono text-[10px] opacity-60 mt-1">{hint}</div>}
    </div>
  );
}
