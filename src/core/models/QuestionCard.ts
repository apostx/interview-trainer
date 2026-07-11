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
  /** Study-only translations of the displayed card text. */
  i18n?: CardI18n;
};
