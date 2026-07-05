"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechModelSize } from "@/core/models";
import { AudioRecorder, blobToPCM } from "@/core/speech/recorder";
import { useTranscriberStore } from "@/stores/transcriberStore";
import { CountupTimer } from "./Timer";
import { ProgressMeter, buttonGhost, buttonPrimary, buttonSecondary, inputBase } from "./ui";

type CaptureState = "idle" | "recording" | "transcribing" | "editing";

/**
 * Voice-first answer input (spec §10 UX): record → transcribe locally →
 * optionally edit → submit. Typing is always available as a fallback, so the
 * whole flow works without a microphone or a downloaded model.
 */
export function AnswerCapture({
  expectedDurationSeconds,
  speechModel,
  submitLabel,
  onSubmit,
  autoFocusHint,
}: {
  expectedDurationSeconds: number;
  speechModel: SpeechModelSize;
  submitLabel: string;
  onSubmit: (transcript: string) => void;
  autoFocusHint?: string;
}) {
  const [state, setState] = useState<CaptureState>("idle");
  const [draft, setDraft] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState(0);
  const recorderRef = useRef<AudioRecorder | null>(null);
  // Only rendered client-side (behind data loading), so this is hydration-safe.
  const [micAvailable] = useState(
    () =>
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
  );

  const transcriberStatus = useTranscriberStore((s) => s.status);
  const loadProgress = useTranscriberStore((s) => s.loadProgress);
  const loadModel = useTranscriberStore((s) => s.load);
  const transcribe = useTranscriberStore((s) => s.transcribe);

  // Cancel the microphone if the component unmounts mid-recording.
  useEffect(() => {
    return () => recorderRef.current?.cancel();
  }, []);

  async function startRecording() {
    setCaptureError(null);
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setRecordingStartedAt(Date.now());
      setState("recording");
      // Preload the model in the background while the user is speaking.
      loadModel(speechModel).catch(() => {});
    } catch {
      setCaptureError(
        "Microphone access failed. You can type your answer instead.",
      );
      setState("editing");
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setState("transcribing");
    try {
      const blob = await recorder.stop();
      const audio = await blobToPCM(blob);
      await loadModel(speechModel);
      const text = await transcribe(audio);
      setDraft((prev) => (prev ? `${prev} ${text}` : text));
      setState("editing");
    } catch (error) {
      setCaptureError(
        `Transcription failed (${error instanceof Error ? error.message : "unknown error"}). You can type your answer instead.`,
      );
      setState("editing");
    }
  }

  function cancelRecording() {
    recorderRef.current?.cancel();
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
        <div className="flex gap-2">
          <button type="button" onClick={stopRecording} className={buttonPrimary}>
            Stop &amp; transcribe
          </button>
          <button type="button" onClick={cancelRecording} className={buttonSecondary}>
            Cancel
          </button>
        </div>
        <p className="text-xs text-muted">
          Audio stays in your browser — transcription runs locally.
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
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-hairline">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
          </div>
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
