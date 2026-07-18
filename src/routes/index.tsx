import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TabSwitcher } from "@/components/yappr/TabSwitcher";
import { SessionEngine } from "@/components/yappr/SessionEngine";
import { FrameworkAccordion } from "@/components/yappr/FrameworkAccordion";
import { StreakChallenge } from "@/components/yappr/StreakChallenge";
import { ProfileButton } from "@/components/yappr/ProfileButton";
import {
  TOPICS, TOPIC_CATEGORIES,
  INTERVIEW_QUESTIONS, INTERVIEW_CATEGORIES,
  VOCAB_DECKS, VOCAB_WORDS, RANDOM_TRACK, TRENDING_TRACK,
  type Tab,
} from "@/lib/yappr-data";
import { fetchTrendingTopics } from "@/lib/yappr-news.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YAPPR — Your Speaking Slot Machine" },
      { name: "description", content: "Forge elite communication skills under pressure. Impromptu, Interview Prep & WordBuzz drills for Indian students, placements & MBA aspirants." },
      { property: "og:title", content: "YAPPR — Your Speaking Slot Machine" },
      { property: "og:description", content: "The digital gym for communication. Trending impromptu topics, interview prep, vocab drills. 30–90 seconds. No fluff." },
    ],
  }),
  component: YapprApp,
});

function YapprApp() {
  const [tab, setTab] = useState<Tab>("topics");

  // Topics — default to TRENDING
  const [topicCat, setTopicCat] = useState<string>(RANDOM_TRACK);
  const [debate, setDebate] = useState<"off" | "for" | "against">("off");
  const [trending, setTrending] = useState<string[]>([]);
  const [trendingState, setTrendingState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let alive = true;
    setTrendingState("loading");
    fetchTrendingTopics()
      .then((r) => {
        if (!alive) return;
        const list = r.topics || [];
        TOPICS[TRENDING_TRACK] = list;
        setTrending(list);
        setTrendingState(list.length ? "ready" : "empty");
      })
      .catch(() => {
        if (!alive) return;
        setTrendingState("empty");
      });
    return () => { alive = false; };
  }, []);

  // Interview
  const [intvCat, setIntvCat] = useState<string>(INTERVIEW_CATEGORIES[0]);

  // Vocab — default to Random Mix deck
  const [vocabDeck, setVocabDeck] = useState<string>(RANDOM_TRACK);
  const [vocabIdx, setVocabIdx] = useState(0);
  const vocabList = VOCAB_WORDS[vocabDeck];
  const vocabWord = vocabList[vocabIdx % vocabList.length];

  const candidates = useMemo(() => {
    if (tab === "topics") {
      const base = topicCat === TRENDING_TRACK ? trending : (TOPICS[topicCat] ?? []);
      if (debate === "off") return base;
      const stance = debate === "for" ? "ARGUE FOR: " : "ARGUE AGAINST: ";
      return base.map((t) => stance + t);
    }
    if (tab === "interview") return INTERVIEW_QUESTIONS[intvCat] ?? [];
    return [`Create a sentence using "${vocabWord.word}".`];
  }, [tab, topicCat, debate, intvCat, vocabWord, trending]);

  // Vocab tab cannot use TRENDING_TRACK — keep the deck list clean.
  const vocabDecksList = useMemo(() => [...VOCAB_DECKS], []);

  return (
    <div className="min-h-screen bg-paper text-ink dot-texture">
      {/* Sticky top nav */}
      <header className="sticky top-0 z-30 bg-yappr-yellow dot-texture brutal-border-thick border-t-0 border-x-0 border-b-[6px]">
        <div className="mx-auto max-w-6xl px-3 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="font-display text-3xl md:text-5xl leading-none truncate">YAPPR</div>
            <div className="font-mono text-[10px] uppercase bg-ink text-paper px-2 py-1 hidden md:inline-block">
              v0 · Forge mode
            </div>
          </div>
          <ProfileButton />
        </div>
        <div className="mx-auto max-w-6xl px-3 md:px-6 pb-3 flex justify-center">
          <TabSwitcher value={tab} onChange={setTab} />
        </div>
        {/* candy stripe */}
        <div className="h-1.5 flex">
          <div className="flex-1 bg-yappr-magenta" />
          <div className="flex-1 bg-yappr-blue" />
          <div className="flex-1 bg-yappr-green" />
          <div className="flex-1 bg-ink" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 md:px-6 py-5 md:py-8 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6">
        {/* Left structural column */}
        <aside className="flex flex-col gap-4 order-2 md:order-1">
          {tab === "topics" && <TopicsLeftPane />}
          {tab === "interview" && <FrameworkAccordion />}
          {tab === "vocab" && <VocabLeftPane />}

          <div id="yappr-plans"><StreakChallenge /></div>

          <div className="brutal-border bg-paper p-3 font-mono text-[10px] leading-relaxed">
            <b>PRIVACY:</b> Voice files never leave your device. Transcripts are processed in your browser and discarded after scoring. We store name, email, and numeric scores only.
          </div>
        </aside>

        {/* Right structural column (interactive engine room) */}
        <section className="order-1 md:order-2">
          {tab === "topics" && (
            <SessionEngine
              candidates={candidates}
              categories={[...TOPIC_CATEGORIES]}
              category={topicCat}
              onCategoryChange={setTopicCat}
              mode={debate === "off" ? "topic" : "debate"}
              recordSeconds={60}
              badge={
                topicCat === TRENDING_TRACK
                  ? (debate === "off" ? "🔥 TRENDING · 60s" : `🔥 TRENDING · ${debate.toUpperCase()} · 60s`)
                  : (debate === "off" ? "IMPROMPTU · 60s" : `DEBATE · ${debate.toUpperCase()} · 60s`)
              }
              abovePromptSlot={
                topicCat === TRENDING_TRACK && trendingState !== "ready" ? (
                  <div className={[
                    "brutal-border p-3 font-mono text-xs flex items-center justify-center gap-2 text-center",
                    trendingState === "loading" ? "bg-yappr-yellow" : "bg-yappr-magenta text-paper",
                  ].join(" ")}>
                    <span className={trendingState === "loading" ? "animate-pulse" : ""}>●</span>
                    {trendingState === "loading"
                      ? "Pulling today's headlines from Indian news…"
                      : "Couldn't reach the news wire. Switch to Random Mix or another track."}
                  </div>
                ) : (
                  <div className="brutal-border bg-paper p-3 font-mono text-xs text-center">
                    Start with what you know. Get comfortable. <span className="text-yappr-magenta font-bold">Then let the machine surprise you.</span>
                  </div>
                )
              }
              topPanel={
                <div className="flex items-center gap-1 brutal-border bg-paper p-1 ml-auto">
                  {(["off", "for", "against"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setDebate(s)}
                      className={[
                        "px-2 py-1 font-display text-sm uppercase brutal-press",
                        debate === s
                          ? s === "off" ? "bg-ink text-paper" : s === "for" ? "bg-yappr-green" : "bg-yappr-magenta text-paper"
                          : "",
                      ].join(" ")}
                    >
                      {s === "off" ? "No debate" : s}
                    </button>
                  ))}
                </div>
              }
            />
          )}
          {tab === "interview" && (
            <SessionEngine
              candidates={candidates}
              categories={[...INTERVIEW_CATEGORIES]}
              category={intvCat}
              onCategoryChange={setIntvCat}
              mode="interview"
              recordSeconds={120}
              badge="INTERVIEW · 2 MIN"
            />
          )}
          {tab === "vocab" && (
            <SessionEngine
              candidates={candidates}
              categories={vocabDecksList}
              category={vocabDeck}
              onCategoryChange={(d) => { setVocabDeck(d); setVocabIdx(0); }}
              mode="vocab"
              recordSeconds={15}
              skipPrep
              badge="WORDBUZZ · 15s"
              requiredWord={vocabWord.word}
              onPull={() => {
                // Advance to the next word in the deck, return the matching prompt so
                // the lever-pull lands on the new word (instead of repeating the old).
                const nextIdx = (vocabIdx + 1) % vocabList.length;
                setVocabIdx(nextIdx);
                const w = vocabList[nextIdx];
                return `Create a sentence using "${w.word}".`;
              }}
              belowPromptSlot={
                <div className="bg-yappr-green brutal-border p-3 font-mono text-sm leading-relaxed">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display text-2xl">{vocabWord.word}</span>
                    <span className="opacity-70">{vocabWord.ipa}</span>
                    <span className="opacity-60">· {vocabWord.pos}</span>
                  </div>
                  <div className="mt-1.5"><b>Def:</b> {vocabWord.def}</div>
                  <div className="opacity-80"><b>Ex:</b> "{vocabWord.ex}"</div>
                </div>
              }
            />
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-3 md:px-6 pb-8 pt-4 font-mono text-[10px] md:text-[11px] opacity-60 text-center md:text-left whitespace-nowrap overflow-x-auto">
        © YAPPR · Built loud in India · Communicate Confidently.
      </footer>
    </div>
  );
}

function TopicsLeftPane() {
  return (
    <div className="flex flex-col gap-4">
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-magenta text-paper p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-80">How it works</div>
        <ol className="font-display text-2xl leading-tight mt-2 space-y-1">
          <li>1. Pull the lever.</li>
          <li>2. Get a sharp prompt.</li>
          <li>3. Think 30s.</li>
          <li>4. Speak 60s.</li>
          <li>5. Get scored. Brutally.</li>
        </ol>
      </div>
      <div className="brutal-border bg-yappr-blue text-paper p-4">
        <div className="font-display text-2xl leading-none">DEBATE MODE</div>
        <div className="font-mono text-xs mt-1 leading-relaxed opacity-90">
          Flip the FOR / AGAINST toggle next to the topic. The engine forces a stance — no fence-sitting.
        </div>
      </div>
      <div className="brutal-border bg-paper p-4">
        <div className="font-display text-xl">PRO TIP</div>
        <div className="font-mono text-xs mt-1">
          Hit 130–160 WPM. Slower than that and your Clarity score drops. Cap fillers under 5% of total words.
        </div>
      </div>
    </div>
  );
}

function VocabLeftPane() {
  return (
    <div className="flex flex-col gap-3">
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-yellow p-4">
        <div className="font-mono text-[10px] uppercase">How WordBuzz works</div>
        <ol className="font-display text-xl leading-tight mt-2 space-y-1">
          <li>1. Pull the lever.</li>
          <li>2. Get one power word + meaning.</li>
          <li>3. Create a sentence using it (15s).</li>
          <li>4. Score: did you actually use it right?</li>
        </ol>
      </div>
      <div className="brutal-border bg-yappr-blue text-paper p-3">
        <div className="font-display text-lg leading-none">PRO TIP</div>
        <div className="font-mono text-xs mt-1 opacity-90">
          Switch decks from the dropdown above the prompt. Pull the lever to roll the next word.
        </div>
      </div>
    </div>
  );
}
