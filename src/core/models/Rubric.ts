import type { InterviewRole } from "./types";

export type RubricImportance = "critical" | "important" | "nice_to_have";

export type RubricItem = {
  id: string;
  label: string;
  description: string;
  importance: RubricImportance;
  roleWeight: Partial<Record<InterviewRole, number>>;
  acceptedSignals: string[];
  weakSignals?: string[];
  negativeSignals?: string[];
  examples?: string[];
};
