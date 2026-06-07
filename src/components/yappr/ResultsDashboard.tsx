import type { AnalysisResult, TranscriptToken } from "@/lib/yappr-analysis";
import type { ContentAnalysis } from "@/lib/yappr-ai.functions";
import type { SessionMode } from "./SessionEngine";

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
  content,
  contentLoading,
  mode,
  idealRewriteUnlocked = false,
}: {
  result: AnalysisResult;
  prompt: string;
  onRetry: () => void;
  content?: ContentAnalysis | null;
  contentLoading?: boolean;
  mode?: SessionMode;
  idealRewriteUnlocked?: boolean;
}) {
  const { scores, tokens, wpm, wordCount, durationSec, microAction } = result;
  const emphasizeContent = mode === "debate" || mode === "interview";

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

      {/* Scores — free tier */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreDial label="Clarity" value={scores.clarity} color="yappr-yellow" />
        <ScoreDial label="Structure" value={scores.structure} color="yappr-blue" />
        <ScoreDial label="Presence" value={scores.presence} color="yappr-magenta" />
        <ScoreDial label="Grammar" value={scores.grammar} color="yappr-green" />
      </div>

      {/* Stats strip — free tier */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="WPM" value={wpm} hint="target 130–160" />
        <Stat label="Words" value={wordCount} />
        <Stat label="Duration" value={`${Math.round(durationSec)}s`} />
      </div>

      {/* Transcript — free tier */}
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

      {/* Micro-action — free tier */}
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-magenta text-paper p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-80">One Micro-Action</div>
        <div className="font-display text-2xl md:text-3xl leading-tight mt-1">{microAction}</div>
      </div>

      {/* ===== PRO SECTION ===== */}
      <div className="brutal-border-thick bg-ink text-paper px-4 py-2 font-mono text-[10px] uppercase tracking-widest flex items-center justify-between">
        <span>Pro Coach · Substance Review</span>
        {!idealRewriteUnlocked && <span className="opacity-70">🔒 Locked</span>}
      </div>

      <LockableBlock unlocked={idealRewriteUnlocked} title="What landed / what wobbled">
        <ContentReview content={content ?? null} loading={!!contentLoading} emphasize={emphasizeContent} mode={mode} />
      </LockableBlock>

      <LockableBlock unlocked={idealRewriteUnlocked} title="Ideal Rewrite — the script you should have said">
        <IdealRewrite
          unlocked={idealRewriteUnlocked}
          text={content?.idealRewrite ?? ""}
          loading={!!contentLoading}
        />
      </LockableBlock>
    </div>
  );
}

function openPlans() {
  if (typeof window === "undefined") return;
  const el = document.getElementById("yappr-plans");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.dispatchEvent(new CustomEvent("yappr-open-plans"));
}

function LockableBlock({
  unlocked, title, children,
}: { unlocked: boolean; title: string; children: React.ReactNode }) {
  if (unlocked) return <>{children}</>;
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-md opacity-60">
        {children}
      </div>
      <button
        type="button"
        onClick={openPlans}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/40 backdrop-blur-[2px] brutal-border brutal-press cursor-pointer"
      >
        <span className="text-3xl">🔒</span>
        <span className="font-display text-lg md:text-xl text-ink text-center px-4">{title}</span>
        <span className="bg-ink text-paper font-mono text-[10px] uppercase px-3 py-1 brutal-border">
          Unlock with Pro →
        </span>
      </button>
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

function ContentReview({
  content, loading, emphasize, mode,
}: {
  content: ContentAnalysis | null;
  loading: boolean;
  emphasize: boolean;
  mode?: SessionMode;
}) {
  const heading = mode === "debate"
    ? "Argument Review"
    : mode === "interview"
      ? "Answer Review"
      : "What You Said";
  if (loading) {
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-blue text-paper p-4">
        <div className="font-mono text-[10px] uppercase opacity-80">AI Coach</div>
        <div className="font-display text-2xl mt-1 animate-pulse">SCANNING YOUR ARGUMENT…</div>
        <div className="font-mono text-xs mt-2 opacity-80">Grading ideas, evidence & angle.</div>
      </div>
    );
  }
  if (!content) {
    return (
      <div className="brutal-border bg-paper p-4">
        <div className="font-mono text-[10px] uppercase opacity-60">AI Coach</div>
        <div className="font-mono text-xs mt-1 opacity-70">
          Speak at least 10 words to unlock content review.
        </div>
      </div>
    );
  }
  return (
    <div className={[
      "brutal-border-thick brutal-shadow-lg p-5",
      emphasize ? "bg-ink text-paper" : "bg-paper",
    ].join(" ")}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase opacity-70">AI Coach · {heading}</div>
          <div className="font-display text-2xl md:text-3xl leading-tight mt-1">{content.verdict}</div>
        </div>
        {content.contentScore > 0 && (
          <div className={[
            "brutal-border px-3 py-2 text-center",
            emphasize ? "bg-yappr-yellow text-ink" : "bg-ink text-paper",
          ].join(" ")}>
            <div className="font-mono text-[9px] uppercase opacity-80">Content</div>
            <div className="font-display text-3xl leading-none">{content.contentScore}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {content.strengths.length > 0 && (
          <ReviewList title="What Landed" items={content.strengths} tone="green" />
        )}
        {content.weaknesses.length > 0 && (
          <ReviewList title="What Wobbled" items={content.weaknesses} tone="magenta" />
        )}
      </div>

      {content.counterPoints.length > 0 && (
        <div className="mt-3 brutal-border bg-yappr-yellow text-ink p-3">
          <div className="font-mono text-[10px] uppercase mb-1">
            {mode === "interview" ? "Follow-ups you didn't cover" : "Counter-points you didn't address"}
          </div>
          <ul className="font-mono text-sm leading-snug space-y-1 list-disc pl-5">
            {content.counterPoints.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {content.betterAngle && (
        <div className="mt-3 brutal-border bg-yappr-blue text-paper p-3">
          <div className="font-mono text-[10px] uppercase opacity-80">Sharper Angle</div>
          <div className="font-display text-xl leading-tight mt-1">{content.betterAngle}</div>
        </div>
      )}
    </div>
  );
}

function ReviewList({ title, items, tone }: { title: string; items: string[]; tone: "green" | "magenta" }) {
  const bg = tone === "green" ? "bg-yappr-green text-ink" : "bg-yappr-magenta text-paper";
  return (
    <div className={`brutal-border p-3 ${bg}`}>
      <div className="font-mono text-[10px] uppercase mb-1 opacity-90">{title}</div>
      <ul className="font-mono text-sm leading-snug space-y-1 list-disc pl-5">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}

function IdealRewrite({ unlocked, text, loading }: { unlocked: boolean; text: string; loading: boolean }) {
  if (!unlocked) {
    // Render a sample card so the LockableBlock blur overlay shows real layout underneath.
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-green text-ink p-4">
        <div className="font-mono text-[10px] uppercase">Ideal Rewrite · read aloud</div>
        <div className="font-display text-xl md:text-2xl leading-snug mt-2">
          Three reasons this matters now — first, the data; second, the counter-example;
          third, the forward-looking ask. End on a one-line stance, not a hedge.
        </div>
        <div className="font-mono text-[10px] mt-3 opacity-70">
          Practice this aloud 3× then re-pull the lever for muscle memory.
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-blue text-paper p-4 animate-pulse">
        <div className="font-mono text-[10px] uppercase opacity-80">Ideal Rewrite</div>
        <div className="font-display text-2xl mt-1">Drafting the perfect version…</div>
      </div>
    );
  }
  if (!text) return null;
  return (
    <div className="brutal-border-thick brutal-shadow-lg bg-yappr-green text-ink p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase">Ideal Rewrite · read aloud</div>
        <button
          onClick={() => { try { navigator.clipboard?.writeText(text); } catch { /* */ } }}
          className="bg-ink text-paper brutal-border brutal-press font-mono text-[10px] px-2 py-1"
        >
          COPY
        </button>
      </div>
      <div className="font-display text-xl md:text-2xl leading-snug mt-2 whitespace-pre-wrap">
        {text}
      </div>
      <div className="font-mono text-[10px] mt-3 opacity-70">
        Practice this aloud 3× then re-pull the lever for muscle memory.
      </div>
    </div>
  );
}
