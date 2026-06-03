import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TabSwitcher } from "@/components/yappr/TabSwitcher";
import { SessionEngine } from "@/components/yappr/SessionEngine";
import { FrameworkAccordion } from "@/components/yappr/FrameworkAccordion";
import { StreakChallenge } from "@/components/yappr/StreakChallenge";
import {
  TOPICS, TOPIC_CATEGORIES,
  INTERVIEW_QUESTIONS, INTERVIEW_CATEGORIES,
  VOCAB_DECKS, VOCAB_WORDS, RANDOM_TRACK,
  type Tab,
} from "@/lib/yappr-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YAPPR — Your Speaking Slot Machine" },
      { name: "description", content: "Forge elite communication skills under pressure. Built for Indian students, placements, GD prep & MBA interviews. Pull the lever, speak for 60 seconds, get scored." },
      { property: "og:title", content: "YAPPR — Your Speaking Slot Machine" },
      { property: "og:description", content: "The digital gym for communication. Random topics, interview prep, vocab drills. 60 seconds. No fluff." },
    ],
  }),
  component: YapprApp,
});

function YapprApp() {
  const [tab, setTab] = useState<Tab>("topics");

  // Topics — default to the Random Mix track
  const [topicCat, setTopicCat] = useState<string>(RANDOM_TRACK);
  const [debate, setDebate] = useState<"off" | "for" | "against">("off");

  // Interview
  const [intvCat, setIntvCat] = useState<string>(INTERVIEW_CATEGORIES[0]);

  // Vocab — default to Random Mix deck
  const [vocabDeck, setVocabDeck] = useState<string>(RANDOM_TRACK);
  const [vocabIdx, setVocabIdx] = useState(0);
  const vocabWord = VOCAB_WORDS[vocabDeck][vocabIdx % VOCAB_WORDS[vocabDeck].length];

  const candidates = useMemo(() => {
    if (tab === "topics") {
      const base = TOPICS[topicCat] ?? [];
      if (debate === "off") return base;
      const stance = debate === "for" ? "ARGUE FOR: " : "ARGUE AGAINST: ";
      return base.map((t) => stance + t);
    }
    if (tab === "interview") return INTERVIEW_QUESTIONS[intvCat] ?? [];
    return [`Define & use "${vocabWord.word}" in a 60-second story.`];
  }, [tab, topicCat, debate, intvCat, vocabWord]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Sticky top nav */}
      <header className="sticky top-0 z-30 bg-yappr-yellow brutal-border-thick border-t-0 border-x-0 border-b-[6px]">
        <div className="mx-auto max-w-6xl px-3 md:px-6 py-3 flex flex-col md:flex-row items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 self-start md:self-center">
            <LogoMark />
            <div className="font-display text-4xl md:text-5xl leading-none">YAPPR</div>
            <div className="font-mono text-[10px] uppercase bg-ink text-paper px-2 py-1 hidden md:block">
              v0 · Forge mode
            </div>
          </div>
          <TabSwitcher value={tab} onChange={setTab} />
          <div className="hidden md:block w-[180px]" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 md:px-6 py-5 md:py-8 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6">
        {/* Left structural column */}
        <aside className="flex flex-col gap-4 order-2 md:order-1">
          {tab === "topics" && <TopicsLeftPane />}
          {tab === "interview" && <FrameworkAccordion />}
          {tab === "vocab" && <VocabLeftPane
            decks={[...VOCAB_DECKS]}
            deck={vocabDeck}
            onDeck={(d) => { setVocabDeck(d); setVocabIdx(0); }}
            word={vocabWord}
            onSkip={() => setVocabIdx((i) => i + 1)}
          />}

          <StreakChallenge />

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
              badge={debate === "off" ? "IMPROMPTU · 60s" : `DEBATE · ${debate.toUpperCase()} · 60s`}
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
              recordSeconds={90}
              badge="INTERVIEW · 90s"
            />
          )}
          {tab === "vocab" && (
            <SessionEngine
              candidates={candidates}
              categories={[...VOCAB_DECKS]}
              category={vocabDeck}
              onCategoryChange={(d) => { setVocabDeck(d); setVocabIdx(0); }}
              mode="vocab"
              recordSeconds={60}
              badge="VOCAB · CONSTRAINT · 60s"
              requiredWord={vocabWord.word}
            />
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-3 md:px-6 pb-8 pt-4 font-mono text-[11px] opacity-60">
        © YAPPR · Built loud in India · For TPOs & MBA aspirants who hate stage fright.
      </footer>
    </div>
  );
}

function LogoMark() {
  // Brutalist mic-as-Y mark — sits inside the yellow header.
  return (
    <div className="brutal-border bg-ink p-1.5 shrink-0" aria-label="YAPPR logo">
      <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
        <rect x="0" y="0" width="40" height="40" fill="var(--yappr-yellow)" />
        <path d="M8 6 L20 22 L32 6" stroke="var(--ink)" strokeWidth="5" fill="none" strokeLinecap="square" />
        <rect x="17" y="20" width="6" height="14" fill="var(--yappr-magenta)" stroke="var(--ink)" strokeWidth="2" />
      </svg>
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

function VocabLeftPane({
  decks, deck, onDeck, word, onSkip,
}: {
  decks: string[];
  deck: string;
  onDeck: (d: string) => void;
  word: { word: string; ipa: string; pos: string; def: string; ex: string };
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="brutal-border-thick brutal-shadow-lg bg-yappr-green p-4">
        <div className="font-mono text-[10px] uppercase">Active Word</div>
        <div className="font-display text-5xl leading-none mt-1">{word.word}</div>
        <div className="font-mono text-sm mt-2">
          {word.ipa} <span className="opacity-60">· {word.pos}</span>
        </div>
        <div className="mt-3 font-mono text-sm leading-relaxed"><b>Def:</b> {word.def}</div>
        <div className="mt-1 font-mono text-sm leading-relaxed"><b>Ex:</b> "{word.ex}"</div>
        <button
          onClick={onSkip}
          className="mt-3 bg-ink text-paper brutal-border brutal-press font-display text-lg px-3 py-1.5"
        >
          NEXT WORD →
        </button>
      </div>
      <div className="brutal-border bg-paper p-3">
        <div className="font-mono text-[10px] uppercase opacity-60 mb-2">Deck</div>
        <div className="flex flex-wrap gap-2">
          {decks.map((d) => (
            <button
              key={d}
              onClick={() => onDeck(d)}
              className={[
                "px-2 py-1 font-display text-base brutal-border brutal-press",
                deck === d ? "bg-ink text-paper" : "bg-paper",
              ].join(" ")}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
