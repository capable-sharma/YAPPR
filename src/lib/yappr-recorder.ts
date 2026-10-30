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

  // ── DESKTOP PATH: WebSpeech API (Live Streaming) with Groq Whisper Backup ───
  let finalTranscript = "";
  let interimTranscript = "";
  let recognition: any = null;

  // MediaRecorder backup in case WebSpeech is unsupported or silent (e.g. Safari / Firefox)
  const chunks: Blob[] = [];
  let mediaRecorder: MediaRecorder | null = null;
  if (stream && typeof MediaRecorder !== "undefined") {
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.start(500);
    } catch { /* MediaRecorder init failed */ }
  }

  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SR) {
    try {
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
      recognition.start();
    } catch { /* already started or failed */ }
  }

  return {
    stop: async () => {
      const durationSec = (Date.now() - startedAt) / 1000;
      try { recognition?.stop(); } catch { /* */ }
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try { mediaRecorder.stop(); } catch { /* */ }
      }
      await new Promise((r) => setTimeout(r, 350));
      stream?.getTracks().forEach((t) => t.stop());
      let transcript = (finalTranscript + " " + interimTranscript).trim();

      // If Web Speech API returned nothing (Safari, Firefox, or mic error),
      // seamlessly transcribe the audio buffer using Groq Whisper.
      if (!transcript && chunks.length > 0 && mediaRecorder) {
        try {
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
          if (blob.size > 0) {
            const audioBase64 = await blobToBase64(blob);
            const res = await transcribeAudio({
              data: { audioBase64, mimeType: mediaRecorder.mimeType || "audio/webm" },
            });
            transcript = res.transcript || "";
          }
        } catch (e) {
          console.error("Desktop Groq Whisper fallback failed:", e);
        }
      }

      return { transcript, durationSec };
    },
    cancel: () => {
      try { recognition?.stop(); } catch { /* */ }
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try { mediaRecorder.stop(); } catch { /* */ }
      }
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
