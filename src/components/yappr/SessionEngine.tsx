import { useEffect, useMemo, useState } from "react";
import { Lever } from "./Lever";
import { CountdownTimer } from "./CountdownTimer";
import { AuthModal, type YapprUser } from "./AuthModal";
import { ResultsDashboard } from "./ResultsDashboard";
import { startRecording, speechSupported } from "@/lib/yappr-recorder";
import { analyzeTranscript, type AnalysisResult } from "@/lib/yappr-analysis";
import { markTodayComplete, loadStreak, hasIdealRewrite } from "@/lib/yappr-streak";
import { analyzeContent, type ContentAnalysis } from "@/lib/yappr-ai.functions";

type Phase = "idle" | "spinning" | "card" | "prep" | "flash" | "record" | "processing" | "auth" | "results";

export type SessionMode = "topic" | "debate" | "interview" | "vocab";

interface SessionEngineProps {
  candidates: string[];
  categories: string[];
  category: string;
  onCategoryChange: (c: string) => void;
  topPanel?: React.ReactNode;
  requiredWord?: string;
  badge?: string;
  /** Mode controls AI grading emphasis */
  mode?: SessionMode;
  /** Speak duration in seconds. Defaults to 60. Interview = 90. */
  recordSeconds?: number;
  /** Skip the 30s prep phase and jump straight to recording. */
  skipPrep?: boolean;
  /** Fired when the user pulls the lever. Return a string to override the picked prompt. */
  onPull?: () => string | void;
  /** Optional content shown directly under the prompt (e.g. vocab meaning card). */
  belowPromptSlot?: React.ReactNode;
  /** Optional banner above the prompt card (e.g. trending-loading/empty state). */
  abovePromptSlot?: React.ReactNode;
}

const STREAK_MIN_SECONDS = 45;

export function SessionEngine({
  candidates, categories, category, onCategoryChange,
  topPanel, requiredWord, badge,
  mode = "topic",
  recordSeconds = 60,
  skipPrep = false,
  onPull, belowPromptSlot, abovePromptSlot,
}: SessionEngineProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState<string>("Pull the lever to start.");
  const [reelOffset, setReelOffset] = useState(0);
  const [recHandle, setRecHandle] = useState<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState<{ transcript: string; durationSec: number } | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [content, setContent] = useState<ContentAnalysis | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [user, setUser] = useState<YapprUser | null>(null);
  const [micErr, setMicErr] = useState<string | null>(null);
  const [speechOk, setSpeechOk] = useState<boolean | null>(null);

  useEffect(() => {
    setSpeechOk(speechSupported());
    try {
      const raw = localStorage.getItem("yappr.user");
      if (raw) setUser(JSON.parse(raw));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    setPhase("idle");
    setPrompt("Pull the lever to start.");
    setResult(null);
    setContent(null);
  }, [categories.join("|"), category]);

  const reel = useMemo(() => {
    const arr = [...candidates];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [candidates, phase === "spinning"]);

  const handlePull = () => {
    if (phase !== "idle" && phase !== "card" && phase !== "results") return;
    if (!candidates.length) return;
    setResult(null);
    setContent(null);
    const override = onPull?.();
    setPhase("spinning");
    setReelOffset(0);
    const picked = typeof override === "string" && override
      ? override
      : candidates[Math.floor(Math.random() * candidates.length)];
    setTimeout(() => {
      setPrompt(picked);
      setPhase("card");
    }, 1300);
  };

  const beginPrep = () => setPhase("prep");

  const onPrepDone = () => {
    setPhase("flash");
    setTimeout(() => actuallyRecord(), 1000);
  };

  const actuallyRecord = async () => {
    setMicErr(null);
    try {
      const h = await startRecording();
      setRecHandle(h);
      setPhase("record");
    } catch (e) {
      setMicErr((e as Error).message || "Microphone access denied.");
      setPhase("card");
    }
  };

  const endRecording = async () => {
    if (!recHandle) return;
    setPhase("processing");
    const out = await recHandle.stop();
    setRecHandle(null);
    setPendingTranscript(out);
    if (!user) {
      setPhase("auth");
    } else {
      finalize(out, user);
    }
  };

  const finalize = (t: { transcript: string; durationSec: number }, _u: YapprUser) => {
    const r = analyzeTranscript(t.transcript, t.durationSec, { requiredWord });
    setResult(r);
    setPhase("results");
    // 45-second floor for streak credit.
    if (t.durationSec >= STREAK_MIN_SECONDS && r.wordCount >= 30) {
      markTodayComplete();
    }
    // Kick off AI substance review (best-effort, non-blocking for UI).
    if (r.wordCount >= 10) {
      setContentLoading(true);
      setContent(null);
      analyzeContent({ data: { transcript: r.rawText, prompt, mode } })
        .then((c) => setContent(c))
        .catch((e) => {
          console.error(e);
          setContent({
            verdict: "AI coach offline — delivery scores still valid.",
            contentScore: 0,
            strengths: [],
            weaknesses: [],
            counterPoints: [],
            betterAngle: "",
            idealRewrite: "",
          });
        })
        .finally(() => setContentLoading(false));
    }
  };

  const onAuth = (u: YapprUser) => {
    setUser(u);
    if (pendingTranscript) finalize(pendingTranscript, u);
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setContent(null);
    setPrompt("Pull the lever to start.");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Category filter strip */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="font-mono text-[10px] uppercase opacity-60">Track</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="brutal-border bg-paper font-display text-xl px-3 py-1.5 focus:outline-none focus:bg-yappr-yellow"
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {topPanel}
      </div>

      {abovePromptSlot}

      {/* Prompt + Lever rail */}
      <div className="flex items-stretch gap-4">
        <div className="brutal-border-thick brutal-shadow-lg bg-paper min-h-[180px] md:min-h-[240px] relative overflow-hidden flex-1">
          {phase === "spinning" ? (
            <div className="h-[180px] md:h-[240px] overflow-hidden relative">
              <div
                className="absolute inset-x-0 top-0 animate-reel"
                style={{ transform: `translateY(${reelOffset}px)` }}
              >
                {reel.concat(reel).map((t, i) => (
                  <div key={i} className="px-5 py-6 border-b-4 border-ink font-display text-2xl md:text-3xl">
                    {t}
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-paper to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-paper to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="p-5 md:p-7 flex flex-col gap-3">
              {badge && (
                <div className="self-start font-mono text-[10px] uppercase tracking-widest bg-ink text-paper px-2 py-1">
                  {badge}
                </div>
              )}
              {requiredWord && phase !== "results" && (
                <VocabSpotlight word={requiredWord} />
              )}
              <div className="font-display text-3xl md:text-5xl leading-[1.05]">{prompt}</div>
              {belowPromptSlot && phase !== "results" && (
                <div className="mt-1">{belowPromptSlot}</div>
              )}
              {phase === "card" && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <button
                    onClick={beginPrep}
                    className="bg-yappr-blue text-paper brutal-border brutal-shadow brutal-press font-display text-2xl px-4 py-2"
                  >
                    START 30s PREP →
                  </button>
                  <span className="font-mono text-[11px] opacity-60">
                    or pull the lever again to re-spin
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="hidden md:flex">
          <Lever
            disabled={!["idle", "card", "results"].includes(phase)}
            onPull={handlePull}
            label="SPIN"
          />
        </div>
      </div>

      {/* Phase strip */}
      {phase === "prep" && (
        <div className="flex flex-col md:flex-row gap-2 items-stretch">
          <div className="flex-1">
            <CountdownTimer seconds={30} variant="prep" onDone={onPrepDone} />
          </div>
          <button
            onClick={onPrepDone}
            className="bg-yappr-green text-ink brutal-border brutal-shadow brutal-press font-display text-xl px-4 py-3 whitespace-nowrap"
          >
            SKIP · RECORD NOW →
          </button>
        </div>
      )}

      {phase === "flash" && (
        <div className="brutal-border-thick brutal-shadow-lg animate-flash p-8 text-center">
          <div className="font-display text-4xl md:text-6xl text-paper">TAP TO RECORD</div>
        </div>
      )}

      {phase === "record" && (
        <div className="flex flex-col gap-3">
          <CountdownTimer seconds={recordSeconds} variant="record" onDone={endRecording} />
          <button
            onClick={endRecording}
            className="bg-ink text-paper brutal-border brutal-shadow brutal-press font-display text-3xl py-4 flex items-center justify-center gap-3"
          >
            <span className="inline-block w-4 h-4 bg-yappr-magenta animate-pulse-record" />
            END EARLY
          </button>
        </div>
      )}

      {phase === "processing" && (
        <div className="brutal-border brutal-shadow bg-yappr-green p-6 font-display text-3xl text-center">
          PROCESSING...
        </div>
      )}

      {phase === "auth" && <AuthModal onSubmit={onAuth} />}

      {phase === "results" && result && (
        <ResultsDashboard
          result={result}
          prompt={prompt}
          onRetry={reset}
          content={content}
          contentLoading={contentLoading}
          mode={mode}
          idealRewriteUnlocked={hasIdealRewrite(loadStreak())}
        />
      )}

      {/* Status strip (mobile lever fallback included) */}
      <div className="flex items-stretch justify-between gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <div className="brutal-border bg-yappr-yellow p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-display text-2xl leading-none">{micErr ? "MIC BLOCKED" : "READY"}</div>
              <div className="font-mono text-[10px] uppercase opacity-70">
                Speak {recordSeconds}s · streak needs {STREAK_MIN_SECONDS}s+
              </div>
            </div>
            <div className="font-mono text-xs mt-1">
              {micErr
                ? micErr
                : speechOk === false
                  ? "Live transcription not supported in this browser. Try Chrome."
                  : "Mic on Chrome/Edge gets you full transcript. Safari works but transcript may be limited."}
            </div>
          </div>
          {user && (
            <div className="font-mono text-[11px] opacity-70">
              Signed in as <b>{user.name}</b>. Streak-ready.
            </div>
          )}
        </div>
        {/* Mobile-only lever */}
        <div className="md:hidden">
          <Lever
            disabled={!["idle", "card", "results"].includes(phase)}
            onPull={handlePull}
            label="SPIN"
          />
        </div>
      </div>
    </div>
  );
}

function VocabSpotlight({ word }: { word: string }) {
  return (
    <div className="self-start bg-yappr-green brutal-border px-3 py-2 font-mono text-xs">
      USE THE WORD <span className="font-display text-2xl ml-2 align-middle">{word}</span> IN YOUR ANSWER
    </div>
  );
}
