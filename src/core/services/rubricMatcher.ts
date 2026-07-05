import type { RubricItem, RubricStatus } from "@/core/models";
import { normalizedIncludes } from "./transcriptNormalizer";

export type RubricMatchResult = {
  coveredRubricItemIds: string[];
  weakRubricItemIds: string[];
  missingRubricItemIds: string[];
};

/**
 * Deterministic rubric matching (spec §11.1): a strong signal marks the item
 * covered, a weak signal alone marks it weak, otherwise it is missing.
 * Negative signals downgrade a covered item to weak.
 */
export function matchRubricItem(
  transcript: string,
  item: RubricItem,
): RubricStatus {
  const strongMatch = item.acceptedSignals.some((signal) =>
    normalizedIncludes(transcript, signal),
  );
  const weakMatch = item.weakSignals?.some((signal) =>
    normalizedIncludes(transcript, signal),
  );
  const negativeMatch = item.negativeSignals?.some((signal) =>
    normalizedIncludes(transcript, signal),
  );

  if (strongMatch) return negativeMatch ? "weak" : "covered";
  if (weakMatch) return "weak";
  return "missing";
}

export function matchRubric(
  transcript: string,
  items: RubricItem[],
): RubricMatchResult {
  const result: RubricMatchResult = {
    coveredRubricItemIds: [],
    weakRubricItemIds: [],
    missingRubricItemIds: [],
  };
  for (const item of items) {
    const status = matchRubricItem(transcript, item);
    if (status === "covered") result.coveredRubricItemIds.push(item.id);
    else if (status === "weak") result.weakRubricItemIds.push(item.id);
    else result.missingRubricItemIds.push(item.id);
  }
  return result;
}

export function statusOf(
  itemId: string,
  result: RubricMatchResult,
): RubricStatus {
  if (result.coveredRubricItemIds.includes(itemId)) return "covered";
  if (result.weakRubricItemIds.includes(itemId)) return "weak";
  return "missing";
}
