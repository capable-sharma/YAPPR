// Browser-side recording + speech recognition utilities.
// Uses Web Speech API for transcription (free, no backend) with MediaRecorder fallback timing.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface RecorderHandle {
  stop: () => Promise<{ transcript: string; durationSec: number }>;
  cancel: () => void;
}

export async function startRecording(): Promise<RecorderHandle> {
  const startedAt = Date.now();
  let finalTranscript = "";
  let interimTranscript = "";
  let stream: MediaStream | null = null;
  let recognition: any = null;

  // Try to get mic permission — even if speech API fails, this confirms the gesture.
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    // continue — speech API may still work on some browsers
  }

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
      // Give recognition a beat to flush final results
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
  return typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}
