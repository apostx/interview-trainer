import type { InterviewRole } from "./types";

export type SpeechModelSize = "tiny" | "base" | "small";

/**
 * whisper: local Transformers.js model — private and offline, but slow
 * without WebGPU. web_speech: the browser's SpeechRecognition (Google's
 * servers in Chrome) — fast and live, but audio leaves the machine.
 */
export type SpeechEngine = "whisper" | "web_speech";

export type UserSettings = {
  id: string;
  targetRole: InterviewRole;
  defaultSessionDurationMinutes: number;
  speechEngine: SpeechEngine;
  preferredSpeechModel: SpeechModelSize;
  localOnlyMode: boolean;
  enableAiReview: boolean;
  showHintsDuringInterview: boolean;
  autoGenerateFollowUps: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  id: "user",
  targetRole: "backend_developer",
  defaultSessionDurationMinutes: 30,
  speechEngine: "whisper",
  preferredSpeechModel: "tiny",
  localOnlyMode: true,
  enableAiReview: false,
  showHintsDuringInterview: true,
  autoGenerateFollowUps: true,
};
