"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function toSpeakablePlainText(raw: string): string {
  const withoutCode = raw.replace(/```[\s\S]*?```/g, " Code snippet provided. ");
  const withoutTables = withoutCode
    .split("\n")
    .filter((line) => !/^\s*\|/.test(line))
    .join(" ");
  return withoutTables
    .replace(/[*_`#|>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBestBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferredNames = [
    "Natural",
    "Premium",
    "Enhanced",
    "Google US English",
    "Google UK English Male",
    "Daniel",
    "Samantha",
    "Karen",
    "Rishi",
    "Alex",
  ];
  for (const name of preferredNames) {
    const match = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const SILENCE_LIMIT_MS = 2000;

export function useVoiceChat({
  onTranscriptUpdate,
  onAutoSend,
  onError,
}: {
  onTranscriptUpdate: (text: string) => void;
  onAutoSend?: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [silenceCountdown, setSilenceCountdown] = useState<number>(2);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const latestTranscriptRef = useRef<string>("");
  const autoSendOnStopRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const termsWarnedRef = useRef(false);

  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  const onAutoSendRef = useRef(onAutoSend);
  const onErrorRef = useRef(onError);
  onTranscriptUpdateRef.current = onTranscriptUpdate;
  onAutoSendRef.current = onAutoSend;
  onErrorRef.current = onError;

  const clearSilenceMonitor = useCallback(() => {
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  const stopRecording = useCallback(
    (isAutoStop = false) => {
      autoSendOnStopRef.current = isAutoStop;
      clearSilenceMonitor();

      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
        const textOut = latestTranscriptRef.current.trim();
        if (textOut) {
          if (isAutoStop && onAutoSendRef.current) {
            onAutoSendRef.current(textOut);
          } else {
            onTranscriptUpdateRef.current(textOut);
          }
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }

      setRecording(false);
      setIsUserSpeaking(false);
      setLiveTranscript("");
      setSilenceCountdown(2);
    },
    [clearSilenceMonitor]
  );

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakText = useCallback(
    async (text: string, id: string, botId?: string) => {
      if (speakingId === id) {
        stopSpeaking();
        return;
      }
      stopSpeaking();

      const cleanText = toSpeakablePlainText(text);
      if (!cleanText) return;

      setSpeakingId(id);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, botId }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("audio/")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => stopSpeaking();
          audio.onerror = () => stopSpeaking();
          await audio.play();
          return;
        }

        const json = (await res.json().catch(() => null)) as { needsTerms?: boolean } | null;
        if (json?.needsTerms && !termsWarnedRef.current) {
          termsWarnedRef.current = true;
          onErrorRef.current?.("Accept Orpheus TTS terms in Groq Console for natural voice.");
        }
      } catch {
        // Fall through to browser Web Speech API
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(cleanText);
        const bestVoice = pickBestBrowserVoice();
        if (bestVoice) utter.voice = bestVoice;
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.onend = () => setSpeakingId(null);
        utter.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(utter);
      } else {
        setSpeakingId(null);
        onErrorRef.current?.("Voice playback unavailable on this device.");
      }
    },
    [speakingId, stopSpeaking]
  );

  const startSilenceWatchdog = useCallback(
    (onTimeout: () => void) => {
      clearSilenceMonitor();
      lastActivityRef.current = Date.now();
      setSilenceCountdown(2);
      silenceIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = Math.max(0, (SILENCE_LIMIT_MS - elapsed) / 1000);
        setSilenceCountdown(Number(remaining.toFixed(1)));
        if (elapsed > 700) {
          setIsUserSpeaking(false);
        }
        if (elapsed >= SILENCE_LIMIT_MS) {
          onTimeout();
        }
      }, 150);
    },
    [clearSilenceMonitor]
  );

  const startMediaRecorderFallback = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current?.("Microphone is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      latestTranscriptRef.current = "";

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const shouldAutoSend = autoSendOnStopRef.current;
        clearSilenceMonitor();
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        setIsUserSpeaking(false);
        setLiveTranscript("");
        setSilenceCountdown(2);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 400) return;

        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          const data = (await res.json().catch(() => null)) as { text?: string } | null;

          const transcribed = data?.text?.trim();
          if (res.ok && transcribed) {
            if (shouldAutoSend && onAutoSendRef.current) {
              onAutoSendRef.current(transcribed);
            } else {
              onTranscriptUpdateRef.current(transcribed);
            }
          } else {
            onErrorRef.current?.("Could not transcribe audio. Try again.");
          }
        } catch {
          onErrorRef.current?.("Voice upload failed. Try again.");
        } finally {
          setTranscribing(false);
        }
      };

      // Adaptive RMS volume silence detection (2s silence autocut)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const timeData = new Uint8Array(analyser.fftSize);

        let noiseFloor = 0.015;
        let samples = 0;
        lastActivityRef.current = Date.now();
        setSilenceCountdown(2);

        clearSilenceMonitor();
        silenceIntervalRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(timeData);
          let sumSq = 0;
          for (let i = 0; i < timeData.length; i++) {
            const norm = (timeData[i] - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / timeData.length);
          samples++;
          if (samples <= 4) {
            noiseFloor = Math.max(0.012, (noiseFloor + rms) / 2);
          }
          const speechThreshold = Math.max(0.032, noiseFloor * 2.2);
          if (rms > speechThreshold) {
            lastActivityRef.current = Date.now();
            setIsUserSpeaking(true);
          } else if (Date.now() - lastActivityRef.current > 600) {
            setIsUserSpeaking(false);
          }
          const elapsed = Date.now() - lastActivityRef.current;
          setSilenceCountdown(Number(Math.max(0, (SILENCE_LIMIT_MS - elapsed) / 1000).toFixed(1)));
          if (elapsed >= SILENCE_LIMIT_MS) {
            stopRecording(true);
          }
        }, 150);
      } catch {
        startSilenceWatchdog(() => stopRecording(true));
      }

      recorder.start(250);
      setRecording(true);
      setLiveTranscript("Listening...");
    } catch {
      onErrorRef.current?.("Microphone permission denied.");
    }
  }, [clearSilenceMonitor, startSilenceWatchdog, stopRecording]);

  const toggleRecording = useCallback(async () => {
    if (recording) {
      // Manual stop by user -> store in input field, DO NOT auto-send
      stopRecording(false);
      return;
    }

    latestTranscriptRef.current = "";
    autoSendOnStopRef.current = false;

    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionCtor) {
      try {
        const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          let finalText = "";
          let interimText = "";
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalText += res[0].transcript + " ";
            } else {
              interimText += res[0].transcript;
            }
          }
          const combined = (finalText + interimText).trim();
          latestTranscriptRef.current = combined;
          setLiveTranscript(combined || "Listening...");
          if (combined) {
            onTranscriptUpdateRef.current(combined);
            setIsUserSpeaking(true);
          }
          lastActivityRef.current = Date.now();
        };

        recognition.onerror = (event: any) => {
          if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
            stopRecording(false);
            onErrorRef.current?.("Microphone permission denied.");
          } else if (event?.error !== "no-speech" && event?.error !== "aborted") {
            stopRecording(false);
            startMediaRecorderFallback();
          }
        };

        recognition.onend = () => {
          clearSilenceMonitor();
          recognitionRef.current = null;
          setRecording(false);
          setLiveTranscript("");
          setSilenceCountdown(2);
        };

        recognition.start();
        setRecording(true);
        setLiveTranscript("Listening...");
        startSilenceWatchdog(() => stopRecording(true));
        return;
      } catch {
        // Fall through to MediaRecorder + Groq Whisper
      }
    }

    await startMediaRecorderFallback();
  }, [
    recording,
    stopRecording,
    startSilenceWatchdog,
    clearSilenceMonitor,
    startMediaRecorderFallback,
  ]);

  return {
    recording,
    isUserSpeaking,
    transcribing,
    liveTranscript,
    silenceCountdown,
    speakingId,
    toggleRecording,
    speakText,
    stopSpeaking,
  };
}
