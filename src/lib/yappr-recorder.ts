// Browser-side recording + speech recognition utilities.
// Hybrid Architecture:
// - Desktop: Uses Web Speech API for real-time live streaming transcription.
// - Mobile: Uses HTML5 MediaRecorder + Groq Whisper API for rock-solid zero-timeout recording.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { transcribeAudio } from "./yappr-ai.functions";

export interface RecorderHandle {
  stop: () => Promise<{ transcript: string; durationSec: number }>;
  cancel: () => void;
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isTouch = navigator.maxTouchPoints > 0;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (isTouch && window.innerWidth < 768)
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function startRecording(): Promise<RecorderHandle> {
  const startedAt = Date.now();
  let stream: MediaStream | null = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error("Microphone access denied:", err);
  }

  const mobile = isMobileDevice();

  // ── MOBILE PATH: MediaRecorder + Groq Whisper ──────────────────────────────
  if (mobile && stream && typeof MediaRecorder !== "undefined") {
    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";

    const mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.start(500);

    return {
      stop: async () => {
        const durationSec = (Date.now() - startedAt) / 1000;
        
        return new Promise((resolve) => {
          mediaRecorder.onstop = async () => {
            stream?.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
            
            if (blob.size === 0) {
              resolve({ transcript: "", durationSec });
              return;
            }

            try {
              const audioBase64 = await blobToBase64(blob);
              const res = await transcribeAudio({
                data: { audioBase64, mimeType: mediaRecorder.mimeType || "audio/webm" },
              });
              resolve({ transcript: res.transcript, durationSec });
            } catch (e) {
              console.error("Groq Whisper transcription failed:", e);
              resolve({ transcript: "", durationSec });
            }
          };

          try {
            mediaRecorder.stop();
          } catch {
            stream?.getTracks().forEach((t) => t.stop());
            resolve({ transcript: "", durationSec });
          }
        });
      },
      cancel: () => {
        try {
          mediaRecorder.stop();
        } catch { /* */ }
        stream?.getTracks().forEach((t) => t.stop());
      },
    };
  }

  // ── DESKTOP PATH: WebSpeech API (Live Streaming) ───────────────────────────
  let finalTranscript = "";
  let interimTranscript = "";
  let recognition: any = null;

  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SR) {
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event: any) => {
      interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalTranscript += res[0].transcript + " ";
        else interimTranscript += res[0].transcript + " ";
      }
    };
    recognition.onerror = () => { /* swallow */ };
    try { recognition.start(); } catch { /* already started */ }
  }

  return {
    stop: async () => {
      const durationSec = (Date.now() - startedAt) / 1000;
      try { recognition?.stop(); } catch { /* */ }
      await new Promise((r) => setTimeout(r, 350));
      stream?.getTracks().forEach((t) => t.stop());
      const transcript = (finalTranscript + " " + interimTranscript).trim();
      return { transcript, durationSec };
    },
    cancel: () => {
      try { recognition?.stop(); } catch { /* */ }
      stream?.getTracks().forEach((t) => t.stop());
    },
  };
}

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!(window as any).SpeechRecognition ||
    !!(window as any).webkitSpeechRecognition ||
    typeof MediaRecorder !== "undefined"
  );
}
