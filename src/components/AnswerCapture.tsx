"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechEngine, SpeechModelSize } from "@/core/models";
import {
  SILENCE_PEAK_THRESHOLD,
  normalizePeak,
  peakLevel,
} from "@/core/speech/audioUtils";
import { AudioRecorder, blobToPCM } from "@/core/speech/recorder";
import { WebSpeechRecognizer } from "@/core/speech/webSpeechRecognizer";
import { useTranscriberStore } from "@/stores/transcriberStore";
import { CountupTimer } from "./Timer";
import { ProgressMeter, buttonGhost, buttonPrimary, buttonSecondary, inputBase } from "./ui";

type CaptureState = "idle" | "recording" | "transcribing" | "editing";

/**
 * Voice-first answer input (spec §10 UX): record → transcribe (locally with
 * Whisper, or live via the browser's speech recognition) → optionally edit →
 * submit. Typing is always available as a fallback, so the whole flow works
 * without a microphone or a downloaded model.
 */
export function AnswerCapture({
  expectedDurationSeconds,
  speechModel,
  speechEngine = "whisper",
  submitLabel,
  onSubmit,
  autoFocusHint,
}: {
  expectedDurationSeconds: number;
  speechModel: SpeechModelSize;
  speechEngine?: SpeechEngine;
  submitLabel: string;
  onSubmit: (transcript: string) => void;
  autoFocusHint?: string;
}) {
  const [state, setState] = useState<CaptureState>("idle");
  const [draft, setDraft] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [heardNothing, setHeardNothing] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const webSpeechRef = useRef<WebSpeechRecognizer | null>(null);
  const maxLevelRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);
  // Only rendered client-side (behind data loading), so this is hydration-safe.
  const [micAvailable] = useState(
    () =>
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
  );
  const useWebSpeech =
    speechEngine === "web_speech" && WebSpeechRecognizer.isSupported();

  const transcriberStatus = useTranscriberStore((s) => s.status);
  const transcriberDevice = useTranscriberStore((s) => s.device);
  const loadProgress = useTranscriberStore((s) => s.loadProgress);
  const loadModel = useTranscriberStore((s) => s.load);
  const transcribe = useTranscriberStore((s) => s.transcribe);

  // Release the microphone and playback URL on unmount.
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      webSpeechRef.current?.cancel();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  // Live input level while recording; flags a silent mic after 3 seconds.
  useEffect(() => {
    if (state !== "recording") return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const level = recorderRef.current?.getLevel() ?? 0;
      setMicLevel(level);
      if (level > maxLevelRef.current) maxLevelRef.current = level;
      setHeardNothing(
        Date.now() - startedAt > 3000 && maxLevelRef.current < 0.02,
      );
    }, 150);
    return () => {
      clearInterval(id);
      setHeardNothing(false);
    };
  }, [state]);

  function keepAudioUrl(blob: Blob) {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    setAudioUrl(url);
  }

  async function startRecording() {
    setCaptureError(null);
    maxLevelRef.current = 0;
    setLiveTranscript("");
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setDeviceLabel(recorder.deviceLabel);
      setRecordingStartedAt(Date.now());
      setState("recording");
      if (useWebSpeech) {
        const recognizer = new WebSpeechRecognizer();
        webSpeechRef.current = recognizer;
        try {
          recognizer.start(setLiveTranscript);
        } catch {
          webSpeechRef.current = null;
        }
      }
      // Preload Whisper in the background — it is the transcriber for the
      // local engine and the fallback for the browser engine.
      loadModel(speechModel).catch(() => {});
    } catch {
      setCaptureError(
        "Microphone access failed. You can type your answer instead.",
      );
      setState("editing");
    }
  }

  async function transcribeWithWhisper(blob: Blob): Promise<void> {
    const audio = await blobToPCM(blob);

    if (peakLevel(audio) < SILENCE_PEAK_THRESHOLD) {
      setCaptureError(
        `The recording was silent${deviceLabel ? ` (device: "${deviceLabel}")` : ""}. ` +
          "Check which microphone the browser uses (click the lock/mic icon in the address bar) and try again — or type your answer.",
      );
      setState("editing");
      return;
    }

    normalizePeak(audio);
    await loadModel(speechModel);
    const text = await transcribe(audio);
    if (!text) {
      setCaptureError(
        "No clear speech was detected in the recording. Listen to it below to check what was captured, then record again or type your answer. If it keeps happening, try the Base model in Settings.",
      );
      setState("editing");
      return;
    }
    setDraft((prev) => (prev ? `${prev} ${text}` : text));
    setState("editing");
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setState("transcribing");
    try {
      const recognizer = webSpeechRef.current;
      webSpeechRef.current = null;
      const [blob, webSpeechText] = await Promise.all([
        recorder.stop(),
        recognizer ? recognizer.stop() : Promise.resolve(""),
      ]);
      keepAudioUrl(blob);

      if (recognizer && webSpeechText && !recognizer.error) {
        setDraft((prev) => (prev ? `${prev} ${webSpeechText}` : webSpeechText));
        setState("editing");
        return;
      }
      if (recognizer) {
        // Browser recognition failed or heard nothing — local Whisper takes
        // over using the same recording.
        setCaptureError(
          recognizer.error
            ? `Browser speech recognition failed (${recognizer.error}) — transcribed locally with Whisper instead.`
            : null,
        );
      }
      await transcribeWithWhisper(blob);
    } catch (error) {
      setCaptureError(
        `Transcription failed (${error instanceof Error ? error.message : "unknown error"}). You can type your answer instead.`,
      );
      setState("editing");
    }
  }

  function cancelRecording() {
    recorderRef.current?.cancel();
    webSpeechRef.current?.cancel();
    webSpeechRef.current = null;
    setState(draft ? "editing" : "idle");
  }

  if (state === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        {micAvailable ? (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:bg-accent-strong focus:outline-4 focus:outline-accent-soft"
              aria-label="Start answering (record with microphone)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9" aria-hidden>
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
                <path d="M19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11h-2Z" />
              </svg>
            </button>
            <p className="text-sm font-medium">Start answering</p>
            <button
              type="button"
              onClick={() => setState("editing")}
              className={buttonGhost}
            >
              Type answer instead
            </button>
            <p className="text-xs text-muted">
              {useWebSpeech
                ? "Engine: browser speech recognition (online, live) — change in Settings"
                : "Engine: local Whisper (private, offline) — change in Settings"}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-secondary">
              Microphone is not available in this browser — type your answer.
            </p>
            <button
              type="button"
              onClick={() => setState("editing")}
              className={buttonPrimary}
            >
              Type answer
            </button>
          </>
        )}
        {autoFocusHint && (
          <p className="max-w-md text-center text-xs text-muted">{autoFocusHint}</p>
        )}
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex items-center gap-2 text-critical">
          <span className="recording-dot h-3 w-3 rounded-full bg-critical" aria-hidden />
          <span className="text-sm font-semibold">Recording…</span>
        </div>
        <CountupTimer
          expectedSeconds={expectedDurationSeconds}
          label="Answer time"
          startedAt={recordingStartedAt}
        />
        <div className="w-full max-w-xs">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-hairline"
            role="meter"
            aria-valuenow={Math.round(micLevel * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Microphone input level"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-150 ${heardNothing ? "bg-critical" : "bg-good"}`}
              style={{ width: `${Math.min(100, micLevel * 130)}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-muted">
            {deviceLabel ? `Mic: ${deviceLabel}` : "Mic level"}
          </p>
          {heardNothing && (
            <p role="alert" className="mt-1 text-center text-xs font-medium text-critical">
              We can&apos;t hear you — is the right microphone selected?
            </p>
          )}
        </div>
        {useWebSpeech && (
          <div className="w-full rounded-lg bg-background px-3 py-2">
            <p className="text-xs text-muted">Live transcript:</p>
            <p className="min-h-5 text-sm leading-relaxed">
              {liveTranscript || <span className="text-muted">listening…</span>}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={stopRecording} className={buttonPrimary}>
            {useWebSpeech ? "Stop" : "Stop & transcribe"}
          </button>
          <button type="button" onClick={cancelRecording} className={buttonSecondary}>
            Cancel
          </button>
        </div>
        <p className="text-xs text-muted">
          {useWebSpeech
            ? "Audio is processed by your browser's speech service (Google)."
            : "Audio stays in your browser — transcription runs locally."}
        </p>
      </div>
    );
  }

  if (state === "transcribing") {
    const loading = transcriberStatus === "loading";
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm font-medium">
          {loading
            ? `Downloading speech model (${Math.round(loadProgress * 100)}%)…`
            : "Transcribing your answer…"}
        </p>
        {loading ? (
          <div className="w-full max-w-sm">
            <ProgressMeter value={loadProgress * 100} label="Model download progress" />
            <p className="mt-2 text-center text-xs text-muted">
              First use downloads the model once; it is cached for next time.
            </p>
          </div>
        ) : (
          <>
            <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-hairline">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
            </div>
            {transcriberDevice === "wasm" && (
              <p className="max-w-sm text-center text-xs text-muted">
                Running on CPU (WebGPU not available) — this can take a while.
                The browser speech engine in Settings is much faster.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // editing
  return (
    <div className="flex flex-col gap-3">
      {captureError && (
        <p role="alert" className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-critical">
          {captureError}
        </p>
      )}
      {audioUrl && (
        <div>
          <p className="mb-1 text-xs text-muted">Your recording:</p>
          <audio controls src={audioUrl} className="h-9 w-full max-w-sm" />
        </div>
      )}
      <label className="text-sm font-medium text-secondary" htmlFor="answer-transcript">
        Your answer transcript
      </label>
      <textarea
        id="answer-transcript"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={7}
        className={`${inputBase} font-normal leading-relaxed`}
        placeholder="Your transcribed or typed answer…"
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={draft.trim().length === 0}
          onClick={() => onSubmit(draft.trim())}
          className={buttonPrimary}
        >
          {submitLabel}
        </button>
        {micAvailable && (
          <button type="button" onClick={startRecording} className={buttonSecondary}>
            Record more
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        You can edit the transcript before review — but you don&apos;t have to.
      </p>
    </div>
  );
}
