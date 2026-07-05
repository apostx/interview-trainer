import type {
  AnswerReview,
  GeneratedPracticeItem,
  PracticeItem,
  PracticeReview,
  QuestionCard,
} from "@/core/models";

export function calculateNextReview(
  score: 0 | 1 | 2 | 3 | 4 | 5,
  currentIntervalDays: number,
): number {
  if (score <= 1) return 1;
  if (score === 2) return Math.max(1, Math.round(currentIntervalDays * 1.2));
  if (score === 3) return Math.round(currentIntervalDays * 2);
  if (score === 4) return Math.round(currentIntervalDays * 3);
  return Math.round(currentIntervalDays * 4);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Applies a practice review and reschedules the item. */
export function applyPracticeReview(
  item: PracticeItem,
  review: PracticeReview,
): PracticeItem {
  const intervalDays = calculateNextReview(
    review.score,
    Math.max(1, item.intervalDays),
  );
  return {
    ...item,
    intervalDays,
    nextReviewAt: addDays(review.reviewedAt, intervalDays),
    reviewHistory: [...item.reviewHistory, review],
  };
}

export function isDue(item: PracticeItem, nowIso: string): boolean {
  return item.nextReviewAt <= nowIso;
}

/**
 * Spec §15: when a critical rubric item is missed, generate a practice item
 * so the gap comes back for review. Items are due immediately.
 */
export function generatePracticeItemsFromReview(
  card: QuestionCard,
  review: AnswerReview,
  nowIso: string,
): PracticeItem[] {
  const missed = card.expectedPoints.filter(
    (item) =>
      item.importance === "critical" &&
      review.missingRubricItemIds.includes(item.id),
  );

  return missed.map((item) => ({
    id: `practice_${card.id}_${item.id}_${Date.parse(nowIso)}`,
    type: "concept_card",
    topicIds: card.topicIds,
    prompt: `You missed "${item.label}" when answering "${card.title}". ${item.description} Explain this point as you would in an interview.`,
    expectedPoints: [item],
    nextReviewAt: nowIso,
    intervalDays: 1,
    easeFactor: 2.5,
    reviewHistory: [],
  }));
}

export function toGeneratedPracticeItem(
  item: PracticeItem,
): GeneratedPracticeItem {
  return {
    id: item.id,
    type: item.type,
    topicIds: item.topicIds,
    prompt: item.prompt,
  };
}
