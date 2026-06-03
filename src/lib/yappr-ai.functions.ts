import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  transcript: z.string().min(1).max(8000),
  prompt: z.string().min(1).max(1000),
  mode: z.enum(["topic", "debate", "interview", "vocab"]),
});

export interface ContentAnalysis {
  verdict: string;
  contentScore: number;
  strengths: string[];
  weaknesses: string[];
  counterPoints: string[];
  betterAngle: string;
}

const FALLBACK: ContentAnalysis = {
  verdict: "Couldn't reach the AI coach. Try again in a moment.",
  contentScore: 0,
  strengths: [],
  weaknesses: [],
  counterPoints: [],
  betterAngle: "",
};

export const analyzeContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<ContentAnalysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ...FALLBACK, verdict: "AI key missing." };

    const focus =
      data.mode === "debate"
        ? "This was a DEBATE. Judge argument strength, evidence, rebuttal of the opposite stance, and logical fallacies harshly."
        : data.mode === "interview"
          ? "This was an INTERVIEW answer. Judge structure (STAR/PREP), specificity of examples, role-relevance, and whether the candidate actually answered the question."
          : data.mode === "vocab"
            ? "This was a vocab drill. Judge whether the target word was used naturally and whether the story made sense."
            : "This was an impromptu speech. Judge argument quality, specificity, and originality of ideas.";

    const system =
      "You are YAPPR — a brutally honest speech coach for Indian students and MBA aspirants. " +
      "Grade the SUBSTANCE of the answer — the ideas, reasoning, evidence, and angle — not just delivery. " +
      "Be specific, punchy, no fluff, no hedging. Output STRICT JSON only, no markdown.";

    const user = `${focus}

PROMPT: ${data.prompt}
TRANSCRIPT: """${data.transcript}"""

Return JSON with EXACTLY this shape:
{
  "verdict": "<one-line punchy verdict on what they SAID, max 14 words>",
  "contentScore": <integer 0-100 judging idea quality, reasoning, specificity>,
  "strengths": ["<2-3 short bullets on what landed in their argument>"],
  "weaknesses": ["<2-3 short bullets on weak reasoning, vague claims, missing evidence>"],
  "counterPoints": ["<2 sharp counter-arguments or follow-up questions they failed to address>"],
  "betterAngle": "<one concrete sharper angle, framework, or example they should have used>"
}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (res.status === 429) return { ...FALLBACK, verdict: "Rate limited — retry shortly." };
      if (res.status === 402) return { ...FALLBACK, verdict: "AI credits exhausted." };
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("AI gateway error", res.status, t);
        return FALLBACK;
      }
      const j = await res.json();
      const content: string = j?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      return {
        verdict: String(parsed.verdict ?? FALLBACK.verdict),
        contentScore: Math.max(0, Math.min(100, Number(parsed.contentScore) || 0)),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).map(String) : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4).map(String) : [],
        counterPoints: Array.isArray(parsed.counterPoints) ? parsed.counterPoints.slice(0, 4).map(String) : [],
        betterAngle: String(parsed.betterAngle ?? ""),
      };
    } catch (e) {
      console.error(e);
      return FALLBACK;
    }
  });
