export interface TranscriptToken {
  text: string;
  kind: "ok" | "filler" | "repeat" | "grammar";
  fix?: string;
}

export interface Scores {
  clarity: number;
  flow: number;
  presence: number;
  grammar: number;
}

export interface AnalysisResult {
  tokens: TranscriptToken[];
  rawText: string;
  wpm: number;
  durationSec: number;
  wordCount: number;
  scores: Scores;
  microAction: string;
  vocabHit?: boolean;
}

// Only true disfluency fillers — natural connectors removed
const FILLER_CORE = new Set([
  "um", "uh", "umm", "uhh", "basically", "literally"
]);

// Sentence starters that signal repetitive opening patterns
const STARTERS = [
  "basically", "so", "like", "actually", "look", "see", "now", "right"
];

// Transition words — reward connected logical thinking
const TRANSITION_WORDS = new Set([
  "however", "therefore", "although", "despite", "because", "whereas",
  "furthermore", "additionally", "nevertheless", "consequently", "meanwhile",
  "firstly", "secondly", "finally", "moreover", "instead", "otherwise",
  "similarly", "conversely", "ultimately", "essentially", "specifically",
  "particularly", "importantly", "significantly", "interestingly"
]);

// Major grammar errors — structural mistakes, -12 points each
const GRAMMAR_MAJOR: { rx: RegExp; fix: string }[] = [
  { rx: /\bi is\b/gi, fix: "I am" },
  { rx: /\bi has\b/gi, fix: "I have" },
  { rx: /\bi was went\b/gi, fix: "I went" },
  { rx: /\bhe don't\b/gi, fix: "he doesn't" },
  { rx: /\bshe don't\b/gi, fix: "she doesn't" },
  { rx: /\bit don't\b/gi, fix: "it doesn't" },
  { rx: /\bhe do\b/gi, fix: "he does" },
  { rx: /\bshe do\b/gi, fix: "she does" },
  { rx: /\bhe have\b/gi, fix: "he has" },
  { rx: /\bshe have\b/gi, fix: "she has" },
  { rx: /\bthey was\b/gi, fix: "they were" },
  { rx: /\bwe was\b/gi, fix: "we were" },
  { rx: /\byou was\b/gi, fix: "you were" },
  { rx: /\bcould of\b/gi, fix: "could have" },
  { rx: /\bshould of\b/gi, fix: "should have" },
  { rx: /\bwould of\b/gi, fix: "would have" },
  { rx: /\bdoes not has\b/gi, fix: "does not have" },
  { rx: /\bdid not went\b/gi, fix: "did not go" },
  { rx: /\bnever went nowhere\b/gi, fix: "never went anywhere" },
  { rx: /\beach of them are\b/gi, fix: "each of them is" },
  { rx: /\bthere is many\b/gi, fix: "there are many" },
  { rx: /\bthere is a lot of\b/gi, fix: "there are a lot of" },
  { rx: /\bmuch people\b/gi, fix: "many people" },
  { rx: /\bme and (he|she|they|him|her|them)\b/gi, fix: "he/she/they and I" },
  { rx: /\bbetween you and i\b/gi, fix: "between you and me" },
  { rx: /\bone of the\s+\w+s?\s+is\b/gi, fix: "one of the … are" },
];

// Minor grammar errors — redundancy and Indian-English preposition habits, -5 points each
const GRAMMAR_MINOR: { rx: RegExp; fix: string }[] = [
  { rx: /\bdiscuss about\b/gi, fix: "discuss (no 'about')" },
  { rx: /\bcope up\b/gi, fix: "cope with" },
  { rx: /\brevert back\b/gi, fix: "revert" },
  { rx: /\breturn back\b/gi, fix: "return" },
  { rx: /\bmore better\b/gi, fix: "better" },
  { rx: /\bmost best\b/gi, fix: "the best" },
  { rx: /\bvery unique\b/gi, fix: "unique" },
  { rx: /\bless people\b/gi, fix: "fewer people" },
  { rx: /\bin nowadays\b/gi, fix: "nowadays" },
  { rx: /\bain't\b/gi, fix: "isn't / aren't" },
  { rx: /\bsince long\b/gi, fix: "for a long time" },
  { rx: /\bdo the needful\b/gi, fix: "do what is needed" },
  { rx: /\bprepone\b/gi, fix: "move earlier / reschedule" },
  { rx: /\bout of station\b/gi, fix: "out of town / travelling" },
  { rx: /\bwhat all\b/gi, fix: "what / which things" },
  { rx: /\bwhere all\b/gi, fix: "where / in which places" },
  { rx: /\bpass out\b/gi, fix: "graduate" },
  { rx: /\bgiving exam\b/gi, fix: "taking an exam" },
  { rx: /\bwrite exam\b/gi, fix: "take an exam / sit an exam" },
  { rx: /\bdo one thing\b/gi, fix: "here's what I suggest" },
  { rx: /\bopposite to\b/gi, fix: "opposite of" },
  { rx: /\bsimilar with\b/gi, fix: "similar to" },
  { rx: /\bdifferent than\b/gi, fix: "different from" },
  { rx: /\bblame on\b/gi, fix: "blame (no 'on')" },
  { rx: /\bask him that\b/gi, fix: "ask him" },
  { rx: /\btell him that he\b/gi, fix: "tell him to" },
  { rx: /\bonly\s+(\w+)\s+only\b/gi, fix: "remove duplicate 'only'" },
];

export function analyzeTranscript(
  rawText: string,
  durationSec: number,
  opts: { requiredWord?: string } = {},
): AnalysisResult {
  const cleaned = rawText.trim();
  const wordsArr = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = wordsArr.length;
  const wpm = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

  // Build tokens
  const tokens: TranscriptToken[] = [];
  const sentenceStartIdx = new Set<number>();
  let atSentenceStart = true;
  const repeatStarterIdxs: number[] = [];
  let lastStarter: string | null = null;

  wordsArr.forEach((w, i) => {
    const lower = w.toLowerCase().replace(/[.,!?;:"']/g, "");
    const isFiller = FILLER_CORE.has(lower);
    let kind: TranscriptToken["kind"] = "ok";
    if (isFiller) kind = "filler";

    if (atSentenceStart) {
      sentenceStartIdx.add(i);
      if (STARTERS.includes(lower)) {
        if (lastStarter === lower) repeatStarterIdxs.push(i, i - 1);
        lastStarter = lower;
      } else {
        lastStarter = null;
      }
    }

    tokens.push({ text: w, kind });
    atSentenceStart = /[.!?]$/.test(w);
  });

  repeatStarterIdxs.forEach((i) => {
    if (tokens[i] && tokens[i].kind === "ok") tokens[i].kind = "repeat";
  });

  // Grammar pass — mark token spans for both major and minor errors
  for (const { rx, fix } of [...GRAMMAR_MAJOR, ...GRAMMAR_MINOR]) {
    const matches = [...cleaned.matchAll(rx)];
    for (const m of matches) {
      const before = cleaned.slice(0, m.index ?? 0).split(/\s+/).filter(Boolean).length;
      const span = m[0].split(/\s+/).length;
      for (let i = before; i < before + span && i < tokens.length; i++) {
        tokens[i].kind = "grammar";
        tokens[i].fix = fix;
      }
    }
  }

  // ── CLARITY ────────────────────────────────────────────────────────────
  const fillerCount = tokens.filter((t) => t.kind === "filler").length;
  const fillerRate = wordCount ? fillerCount / wordCount : 1;
  
  // Smooth gradient — distance from ideal zone (130–160 WPM), max 35pt penalty
  let pacePenalty = 0;
  if (wpm < 130) pacePenalty = Math.min(35, (130 - wpm) * 0.7);
  else if (wpm > 160) pacePenalty = Math.min(35, (wpm - 160) * 0.7);
  
  const fillerPenalty = Math.round(fillerRate * 120);
  const clarity = clamp(Math.max(45, 100 - pacePenalty - fillerPenalty));
  
  // ── GRAMMAR ────────────────────────────────────────────────────────────
  let majorIssues = 0;
  let minorIssues = 0;
  let prevWasGrammar = false;
  
  tokens.forEach((t) => {
    if (t.kind === "grammar") {
      if (!prevWasGrammar) {
        const isMajor = GRAMMAR_MAJOR.some(({ fix }) => fix === t.fix);
        if (isMajor) majorIssues++;
        else minorIssues++;
      }
      prevWasGrammar = true;
    } else {
      prevWasGrammar = false;
    }
  });
  
  // Major -12 pts, minor -5 pts, total penalty capped at 40
  const grammarPenalty = Math.min(40, majorIssues * 12 + minorIssues * 5);
  const grammar = clamp(Math.max(55, 100 - grammarPenalty));
  
  // ── FLOW ───────────────────────────────────────────────────────────────
  const repeats = tokens.filter((t) => t.kind === "repeat").length;
  
  // Component A — volume base
  let flowBase = 45;
  if (wordCount >= 30) flowBase = 60;
  if (wordCount >= 60) flowBase = 70;
  if (wordCount >= 100) flowBase = 75;
  
  // Component B — starter diversity penalty
  const starterPenalty = repeats * 5;
  
  // Component C — transition word bonus, capped at +15
  const usedTransitions = new Set(
    wordsArr
      .map((w) => w.toLowerCase().replace(/[.,!?;:"']/g, ""))
      .filter((w) => TRANSITION_WORDS.has(w))
  );
  const transitionBonus = Math.min(15, usedTransitions.size * 5);
  
  const flow = clamp(Math.max(45, flowBase - starterPenalty + transitionBonus));
  
  // ── PRESENCE ───────────────────────────────────────────────────────────
  const uniqueWords = new Set(wordsArr.map((w) => w.toLowerCase())).size;
  const lexicalDensity = wordCount ? uniqueWords / wordCount : 0;
  
  let presence = Math.round(25 + lexicalDensity * 95);
  
  // Short answer cap — density is meaningless under 40 words
  if (wordCount < 40) presence = Math.min(presence, 60);
  
  // Sustained vocabulary bonus
  if (wordCount >= 80 && lexicalDensity >= 0.65) presence += 8;
  
  // WordBuzz modifier — unchanged
  if (opts.requiredWord) {
    const hit = cleaned.toLowerCase().includes(opts.requiredWord.toLowerCase());
    presence += hit ? 10 : -20;
  }
  presence = clamp(Math.max(40, presence));
  
  // ── MICRO-ACTION ───────────────────────────────────────────────────────
  const microAction = pickMicroAction({
    wpm,
    fillerRate,
    majorGrammarErrors: majorIssues,
    minorGrammarErrors: minorIssues,
    repeats,
    wordCount,
    durationSec,
    transitionCount: usedTransitions.size,
  });

  return {
    tokens,
    rawText: cleaned,
    wpm,
    durationSec,
    wordCount,
    scores: { clarity, flow, presence, grammar },
    microAction,
    vocabHit: opts.requiredWord
      ? cleaned.toLowerCase().includes(opts.requiredWord.toLowerCase())
      : undefined,
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pickMicroAction(args: {
  wpm: number;
  fillerRate: number;
  majorGrammarErrors: number;
  minorGrammarErrors: number;
  repeats: number;
  wordCount: number;
  durationSec: number;
  transitionCount: number;
}): string {
  if (args.wordCount < 30)
    return "You held back — next round commit to speaking for the full 60 seconds. Volume builds confidence.";
  if (args.wpm < 110)
    return "You spoke too slowly. Aim for 130–150 WPM — think less, say more. Gaps kill momentum.";
  if (args.wpm > 175)
    return "You rushed it. After every sentence, take one breath before the next. Pace is confidence.";
  if (args.fillerRate > 0.08)
    return "Too many fillers. Next round — when you feel an 'um' coming, go silent for 1 second instead. Silence beats filler every time.";
  if (args.majorGrammarErrors >= 2)
    return "Watch your subject-verb agreement and tenses — these are the errors people notice first. Say each sentence clearly before moving on.";
  if (args.majorGrammarErrors === 1)
    return "One clear grammar slip in there — find it in your transcript and say the correct version 3 times before your next pull.";
  if (args.minorGrammarErrors >= 3)
    return "Some small grammar habits to clean up — check your transcript for the highlighted words and note the corrections.";
  if (args.repeats >= 3)
    return "You opened too many sentences the same way. Next round, vary your openers — try starting one with a number, one with 'However', one with a question.";
  if (args.transitionCount === 0 && args.wordCount >= 60)
    return "You listed your points but didn't connect them. Use 'because', 'however', 'which means' to build a chain of thought — not a bullet list out loud.";
  if (args.transitionCount === 1 && args.wordCount >= 80)
    return "Good start on connecting ideas — push for 2–3 transition words next round to show the relationship between your points.";
  if (args.repeats >= 1)
    return "You started a couple of sentences the same way — small thing, big impact. Mix your openers next round.";
  if (args.minorGrammarErrors >= 1)
    return "Almost clean — one small grammar habit to fix. Check the highlighted word in your transcript.";
  return "Solid session. Next challenge — open with your strongest point in the first 10 seconds, then build the reason why.";
}
