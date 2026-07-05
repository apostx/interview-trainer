import type {
  InterviewRole,
  RubricItem,
  RubricStatus,
} from "@/core/models";
import type { RubricMatchResult } from "./rubricMatcher";
import { statusOf } from "./rubricMatcher";

export function rubricStatusScore(status: RubricStatus): number {
  if (status === "covered") return 1;
  if (status === "weak") return 0.5;
  return 0;
}

export const importanceWeight = {
  critical: 3,
  important: 2,
  nice_to_have: 1,
} as const;

/** Items without an explicit weight for the current role still count a bit. */
const DEFAULT_ROLE_WEIGHT = 3;

export function itemWeight(item: RubricItem, role: InterviewRole): number {
  const roleWeight = item.roleWeight[role] ?? DEFAULT_ROLE_WEIGHT;
  return importanceWeight[item.importance] * roleWeight;
}

/**
 * Weighted score 0–100 (spec §12):
 * score = weightedCoveredPoints / totalPossibleWeightedPoints * 100
 */
export function computeScore(
  items: RubricItem[],
  result: RubricMatchResult,
  role: InterviewRole,
): number {
  let earned = 0;
  let possible = 0;
  for (const item of items) {
    const weight = itemWeight(item, role);
    possible += weight;
    earned += weight * rubricStatusScore(statusOf(item.id, result));
  }
  if (possible === 0) return 0;
  return Math.round((earned / possible) * 100);
}

export function buildFeedbackSummary(
  items: RubricItem[],
  result: RubricMatchResult,
): string {
  const missingCritical = items.filter(
    (i) =>
      i.importance === "critical" &&
      result.missingRubricItemIds.includes(i.id),
  );
  const covered = result.coveredRubricItemIds.length;
  const total = items.length;

  const parts = [`You covered ${covered} of ${total} expected points.`];
  if (missingCritical.length > 0) {
    parts.push(
      `Missing critical points: ${missingCritical.map((i) => i.label).join(", ")}.`,
    );
  } else if (result.missingRubricItemIds.length === 0) {
    parts.push("All expected points were addressed — strong answer.");
  }
  if (result.weakRubricItemIds.length > 0) {
    parts.push(
      `${result.weakRubricItemIds.length} point(s) were only touched briefly — try to make them explicit.`,
    );
  }
  return parts.join(" ");
}
