import type { RubricStatus } from "./types";
import type { PracticeItem } from "./Practice";

export type ManualRubricOverride = {
  rubricItemId: string;
  previousStatus: RubricStatus;
  newStatus: RubricStatus;
  reason?: string;
};

export type GeneratedPracticeItem = Pick<
  PracticeItem,
  "id" | "type" | "topicIds" | "prompt"
>;

export type AnswerReview = {
  questionCardId: string;
  transcript: string;
  coveredRubricItemIds: string[];
  missingRubricItemIds: string[];
  weakRubricItemIds: string[];
  manualOverrides: ManualRubricOverride[];
  scores: {
    technicalCorrectness: number;
    structure: number;
    depth: number;
    tradeoffs: number;
    communication: number;
    roleFit: number;
  };
  totalScore: number;
  feedbackSummary: string;
  generatedPracticeItems: GeneratedPracticeItem[];
};
