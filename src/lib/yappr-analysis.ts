export interface TranscriptToken {
  text: string;
  kind: "ok" | "filler" | "repeat" | "grammar";
  fix?: string;
}

export interface Scores {
  clarity: number;
  structure: number;
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

const FILLERS = new Set(["um", "uh", "umm", "uhh", "like", "you", "know", "basically", "actually", "literally", "so", "well"]);
const FILLER_CORE = new Set(["um", "uh", "umm", "uhh", "basically", "literally"]);
const STARTERS = ["basically", "so", "like", "actually"];

const GRAMMAR_PATTERNS: { rx: RegExp; fix: string }[] = [
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
  { rx: /\bdiscuss about\b/gi, fix: "discuss" },
  { rx: /\bcope up\b/gi, fix: "cope with" },
  { rx: /\brevert back\b/gi, fix: "revert" },
  { rx: /\breturn back\b/gi, fix: "return" },
  { rx: /\bmore better\b/gi, fix: "better" },
  { rx: /\bmost best\b/gi, fix: "the best" },
  { rx: /\bvery unique\b/gi, fix: "unique" },
  { rx: /\bone of the\s+\w+s?\s+(is|was)\b/gi, fix: "one of the … are" },
  { rx: /\b(a|an) (\w+)s\b/gi, fix: "drop the article or singular noun" },
  { rx: /\bcould of\b/gi, fix: "could have" },
  { rx: /\bshould of\b/gi, fix: "should have" },
  { rx: /\bwould of\b/gi, fix: "would have" },
  { rx: /\bain't\b/gi, fix: "isn't / aren't" },
  { rx: /\beach of them are\b/gi, fix: "each of them is" },
  { rx: /\bthere is many\b/gi, fix: "there are many" },
  { rx: /\bthere is a lot of\b/gi, fix: "there are a lot of" },
  { rx: /\bmuch people\b/gi, fix: "many people" },
  { rx: /\bless people\b/gi, fix: "fewer people" },
  { rx: /\bin nowadays\b/gi, fix: "nowadays" },
  { rx: /\bdoes not has\b/gi, fix: "does not have" },
  { rx: /\bdid not went\b/gi, fix: "did not go" },
  { rx: /\bnever went nowhere\b/gi, fix: "never went anywhere" },
  { rx: /\bbetween you and i\b/gi, fix: "between you and me" },
  { rx: /\bme and (he|she|they|him|her|them)\b/gi, fix: "he/she/they and I" },
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

  // Grammar pass — mark token spans
  for (const { rx, fix } of GRAMMAR_PATTERNS) {
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

  // Scores
  const fillerCount = tokens.filter((t) => t.kind === "filler").length;
  const fillerRate = wordCount ? fillerCount / wordCount : 1;

  const clarityWpm = wpm;
  let clarity = 100;
  if (clarityWpm < 110 || clarityWpm > 180) clarity -= 30;
  else if (clarityWpm < 130 || clarityWpm > 160) clarity -= 12;
  clarity -= Math.round(fillerRate * 200);
  clarity = clamp(clarity);

  const grammarErrors = tokens.filter((t) => t.kind === "grammar").length;
  const grammar = clamp(100 - grammarErrors * 8);

  const repeats = tokens.filter((t) => t.kind === "repeat").length;
  const structure = clamp(
    60 +
      (wordCount > 60 ? 15 : 0) +
      (cleaned.match(/[.!?]/g)?.length ?? 0) * 3 -
      repeats * 6,
  );

  const uniqueWords = new Set(wordsArr.map((w) => w.toLowerCase())).size;
  const lexicalDensity = wordCount ? uniqueWords / wordCount : 0;
  let presence = Math.round(40 + lexicalDensity * 90);
  if (opts.requiredWord) {
    const hit = cleaned.toLowerCase().includes(opts.requiredWord.toLowerCase());
    presence += hit ? 10 : -20;
  }
  presence = clamp(presence);

  // Micro-action
  const microAction = pickMicroAction({ wpm, fillerRate, grammarErrors, repeats, wordCount, durationSec });

  return {
    tokens,
    rawText: cleaned,
    wpm,
    durationSec,
    wordCount,
    scores: { clarity, structure, presence, grammar },
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
  grammarErrors: number;
  repeats: number;
  wordCount: number;
  durationSec: number;
}): string {
  if (args.wordCount < 30) return "You barely spoke — next round, push past the 100-word mark before stopping.";
  if (args.wpm < 110) return "You spoke too slowly. Tomorrow, aim for 140 WPM — drop the long pauses between clauses.";
  if (args.wpm > 175) return "You raced through it. Slow down to ~150 WPM and breathe after every sentence.";
  if (args.fillerRate > 0.08) return "Cut the filler words. Next round, replace every 'um' / 'basically' with a 1-second silent pause.";
  if (args.grammarErrors >= 2) return "Tighten your tenses. Rehearse 3 sentences in past tense before your next pull.";
  if (args.repeats >= 2) return "You started multiple sentences with the same word. Open your next answer with a question instead.";
  return "Strong run. Tomorrow, lead with your conclusion in the first 10 seconds, then back it up.";
}
