import type { InterviewMode } from "./types";

/**
 * User-facing practice types. The seven InterviewModes stay the engine's
 * vocabulary (cards, generator, spec §6); these three are what the setup
 * screen exposes and map onto them.
 */
export type PracticeType =
  | "quick_questions"
  | "real_scenarios"
  | "architecture_practice";

export const PRACTICE_TYPES: PracticeType[] = [
  "quick_questions",
  "real_scenarios",
  "architecture_practice",
];

export const PRACTICE_TYPE_LABELS: Record<PracticeType, string> = {
  quick_questions: "Quick Questions",
  real_scenarios: "Real Scenarios",
  architecture_practice: "Architecture Practice",
};

export const PRACTICE_TYPE_DESCRIPTIONS: Record<PracticeType, string> = {
  quick_questions: "Short concept checks — definition, use case, trade-off.",
  real_scenarios: "Practical situations, troubleshooting and war stories.",
  architecture_practice: "System design, design review and trade-off decisions.",
};

export const PRACTICE_TYPE_MODES: Record<PracticeType, InterviewMode[]> = {
  quick_questions: ["concept_check"],
  real_scenarios: ["scenario_discussion", "troubleshooting", "experience_deep_dive"],
  architecture_practice: ["system_design", "tradeoff_decision", "design_review"],
};

export function modesForPracticeTypes(types: PracticeType[]): InterviewMode[] {
  return [...new Set(types.flatMap((t) => PRACTICE_TYPE_MODES[t]))];
}
