import type { InterviewMode, InterviewRole } from "./types";
import type { RubricItem } from "./Rubric";
import type { CardI18n } from "./Translation";

export type FollowUpTrigger =
  | { type: "rubric_covered"; rubricItemId: string }
  | { type: "rubric_missing"; rubricItemId: string }
  | { type: "topic_mentioned"; topicId: string }
  | { type: "always" };

export type FollowUpQuestion = {
  id: string;
  trigger: FollowUpTrigger;
  prompt: string;
  expectedPoints: RubricItem[];
};

/**
 * Optional material for the two-page flashcard PDF (back side). Both fields
 * are backward-compatible extras: when absent, the export falls back to a
 * short sampleStrongAnswer and the primary topic's first common mistake.
 */
export type QuestionFlashcard = {
  /** 1–3 natural sentences a candidate could realistically say aloud. */
  shortAnswer?: string;
  /** The most common incomplete or incorrect answer, one sentence. */
  commonMistake?: string;
};

export type QuestionCard = {
  id: string;
  title: string;
  prompt: string;
  roles: InterviewRole[];
  modes: InterviewMode[];
  topicIds: string[];
  expectedDurationSeconds: number;
  thinkingTimeSeconds: number;
  answerStructureHint?: string;
  expectedPoints: RubricItem[];
  followUps: FollowUpQuestion[];
  sampleStrongAnswer?: string;
  sampleWeakAnswer?: string;
  /** Optional flashcard-back material (see QuestionFlashcard). */
  flashcard?: QuestionFlashcard;
  /** Study-only translations of the displayed card text. */
  i18n?: CardI18n;
};
