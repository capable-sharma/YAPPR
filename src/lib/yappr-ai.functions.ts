import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  CONTENT_SCORE_RUBRIC,
  buildFocusInstruction,
  buildUserPrompt,
} from "./ai-prompts";

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
  idealRewrite: string;
}

const FALLBACK: ContentAnalysis = {
  verdict: "Couldn't reach the AI coach. Your delivery scores are still valid.",
  contentScore: 0,
  idealRewrite: "",
  strengths: [],
  weaknesses: [],
  counterPoints: [],
  betterAngle: "",
};

function parseResponse(parsed: Record<string, unknown>): ContentAnalysis {
  return {
    verdict: String(parsed.verdict ?? FALLBACK.verdict),
    contentScore: Math.max(0, Math.min(100, Number(parsed.contentScore) || 0)),
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.slice(0, 4).map(String)
      : [],
    weaknesses: Array.isArray(parsed.weaknesses)
      ? parsed.weaknesses.slice(0, 4).map(String)
      : [],
    counterPoints: Array.isArray(parsed.counterPoints)
      ? parsed.counterPoints.slice(0, 4).map(String)
      : [],
    betterAngle: String(parsed.betterAngle ?? ""),
    idealRewrite: String(parsed.idealRewrite ?? ""),
  };
}

// ── Primary — Gemini 2.5 Flash ────────────────────────────────────────────────

async function callGemini(
  key: string,
  userPrompt: string
): Promise<ContentAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    clearTimeout(timeout);

    if (res.status === 429) throw new Error("GEMINI_RATE_LIMITED");
    if (!res.ok) throw new Error(`GEMINI_HTTP_${res.status}`);

    const j = await res.json();
    const content: string =
      j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return parseResponse(JSON.parse(content));
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── Fallback — Groq (Llama 3.1 8b Instant) ───────────────────────────────────

async function callGroq(
  key: string,
  userPrompt: string
): Promise<ContentAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`GROQ_HTTP_${res.status}`);

    const j = await res.json();
    const content: string = j?.choices?.[0]?.message?.content ?? "{}";
    return parseResponse(JSON.parse(content));
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── Server function ───────────────────────────────────────────────────────────

export const analyzeContent = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<ContentAnalysis> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!geminiKey && !groqKey) {
      return {
        ...FALLBACK,
        verdict: "AI key missing — check environment variables.",
      };
    }

    const focus = buildFocusInstruction(data.mode);
    const userPrompt = buildUserPrompt(
      focus,
      data.prompt,
      data.transcript,
      CONTENT_SCORE_RUBRIC
    );

    // Try Gemini first
    if (geminiKey) {
      try {
        return await callGemini(geminiKey, userPrompt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("abort")) {
          console.warn("Gemini timed out — falling back to Groq");
        } else if (msg === "GEMINI_RATE_LIMITED") {
          console.warn("Gemini rate limited — falling back to Groq");
        } else {
          console.warn("Gemini failed — falling back to Groq:", msg);
        }
      }
    }

    // Fallback — Groq
    if (groqKey) {
      try {
        return await callGroq(groqKey, userPrompt);
      } catch (e) {
        console.error("Groq fallback also failed:", e);
      }
    }

    // Both failed
    return {
      ...FALLBACK,
      verdict:
        "AI coach is temporarily unavailable — your delivery scores are still valid.",
    };
  });

// ── Audio Transcription Function (Groq Whisper) ──────────────────────────

const TranscribeInput = z.object({
  audioBase64: z.string(),
  mimeType: z.string().optional(),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data }): Promise<{ transcript: string }> => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.warn("GROQ_API_KEY missing for audio transcription");
      return { transcript: "" };
    }

    try {
      const mime = data.mimeType || "audio/webm";
      const buffer = Buffer.from(data.audioBase64, "base64");
      const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a" : "webm";
      const file = new File([buffer], `speech.${ext}`, { type: mime });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "en");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Groq Whisper API error:", response.status, errText);
        return { transcript: "" };
      }

      const result = await response.json();
      return { transcript: (result.text || "").trim() };
    } catch (err) {
      console.error("Audio transcription exception:", err);
      return { transcript: "" };
    }
  });
