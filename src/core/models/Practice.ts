import type { RubricItem } from "./Rubric";

export type PracticeItemType =
  | "concept_card"
  | "mini_scenario"
  | "tradeoff_card"
  | "followup_drill";

export type PracticeReview = {
  reviewedAt: string;
  score: 0 | 1 | 2 | 3 | 4 | 5;
  transcript?: string;
  notes?: string;
};

export type PracticeItem = {
  id: string;
  type: PracticeItemType;
  topicIds: string[];
  prompt: string;
  expectedPoints: RubricItem[];
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  reviewHistory: PracticeReview[];
};
