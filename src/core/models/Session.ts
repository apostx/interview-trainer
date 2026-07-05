import type { InterviewMode, InterviewRole } from "./types";
import type { AnswerReview } from "./Review";

export type SessionQuestionStatus =
  | "pending"
  | "thinking"
  | "answering"
  | "reviewed"
  | "skipped";

export type FollowUpAnswer = {
  followUpId: string;
  prompt: string;
  transcript: string;
  coveredRubricItemIds: string[];
  missingRubricItemIds: string[];
};

export type SessionQuestion = {
  id: string;
  questionCardId: string;
  status: SessionQuestionStatus;
  transcript?: string;
  audioUrl?: string;
  startedAt?: string;
  answeredAt?: string;
  review?: AnswerReview;
  followUpQuestionIds: string[];
  followUpAnswers?: FollowUpAnswer[];
};

export type InterviewScore = {
  totalScore: number;
};

export type InterviewSession = {
  id: string;
  role: InterviewRole;
  modes: InterviewMode[];
  startedAt: string;
  endedAt?: string;
  targetDurationMinutes: number;
  questions: SessionQuestion[];
  overallScore?: InterviewScore;
  weakTopicIds: string[];
};
