import type { InterviewRole } from "./types";

export type SpeechModelSize = "tiny" | "base" | "small";

export type UserSettings = {
  id: string;
  targetRole: InterviewRole;
  defaultSessionDurationMinutes: number;
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
  preferredSpeechModel: "tiny",
  localOnlyMode: true,
  enableAiReview: false,
  showHintsDuringInterview: true,
  autoGenerateFollowUps: true,
};
