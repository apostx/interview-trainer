import type {
  AnswerReview,
  InterviewRole,
  InterviewSession,
  ManualRubricOverride,
  PracticeItem,
  QuestionCard,
  RubricStatus,
} from "@/core/models";
import { matchRubric, matchRubricItem, type RubricMatchResult } from "./rubricMatcher";
import { buildFeedbackSummary, computeScore } from "./scoringEngine";
import {
  combineStatuses,
  hasNegativeSignal,
  semanticSimilarities,
  statusFromSimilarity,
  type EmbedFn,
} from "./semanticMatcher";
import {
  generatePracticeItemsFromReview,
  toGeneratedPracticeItem,
} from "./spacedRepetition";

function buildReview(
  card: QuestionCard,
  transcript: string,
  role: InterviewRole,
  nowIso: string,
  match: RubricMatchResult,
  semanticUpgradedIds: string[],
): { review: AnswerReview; practiceItems: PracticeItem[] } {
  const totalScore = computeScore(card.expectedPoints, match, role);

  const review: AnswerReview = {
    questionCardId: card.id,
    transcript,
    coveredRubricItemIds: match.coveredRubricItemIds,
    missingRubricItemIds: match.missingRubricItemIds,
    weakRubricItemIds: match.weakRubricItemIds,
    manualOverrides: [],
    scores: {
      technicalCorrectness: totalScore,
      structure: totalScore,
      depth: totalScore,
      tradeoffs: totalScore,
      communication: totalScore,
      roleFit: totalScore,
    },
    totalScore,
    feedbackSummary: buildFeedbackSummary(card.expectedPoints, match),
    generatedPracticeItems: [],
    semanticUpgradedIds,
  };

  const practiceItems = generatePracticeItemsFromReview(card, review, nowIso);
  review.generatedPracticeItems = practiceItems.map(toGeneratedPracticeItem);

  return { review, practiceItems };
}

/**
 * Deterministic (keyword-only) review — spec §11.1. Also the fallback when
 * the embedding model is unavailable.
 */
export function reviewAnswer(
  card: QuestionCard,
  transcript: string,
  role: InterviewRole,
  nowIso: string,
): { review: AnswerReview; practiceItems: PracticeItem[] } {
  const match = matchRubric(transcript, card.expectedPoints);
  return buildReview(card, transcript, role, nowIso, match, []);
}

/**
 * Hybrid review (spec §11.1 + §11.2): keyword matching first, then a local
 * semantic pass that upgrades paraphrased points. Falls back to keyword-only
 * when embedding fails, so a broken model never blocks the flow.
 */
export async function reviewAnswerHybrid(
  card: QuestionCard,
  transcript: string,
  role: InterviewRole,
  nowIso: string,
  embed: EmbedFn,
): Promise<{ review: AnswerReview; practiceItems: PracticeItem[] }> {
  let similarities: Map<string, number>;
  try {
    similarities = await semanticSimilarities(
      transcript,
      card.expectedPoints,
      embed,
    );
  } catch {
    return reviewAnswer(card, transcript, role, nowIso);
  }

  const match: RubricMatchResult = {
    coveredRubricItemIds: [],
    weakRubricItemIds: [],
    missingRubricItemIds: [],
  };
  const semanticUpgradedIds: string[] = [];

  for (const item of card.expectedPoints) {
    const keywordStatus = matchRubricItem(transcript, item);
    const semanticStatus = statusFromSimilarity(similarities.get(item.id) ?? 0);
    const finalStatus = combineStatuses(
      keywordStatus,
      semanticStatus,
      hasNegativeSignal(transcript, item),
    );
    if (finalStatus !== keywordStatus) semanticUpgradedIds.push(item.id);
    if (finalStatus === "covered") match.coveredRubricItemIds.push(item.id);
    else if (finalStatus === "weak") match.weakRubricItemIds.push(item.id);
    else match.missingRubricItemIds.push(item.id);
  }

  return buildReview(card, transcript, role, nowIso, match, semanticUpgradedIds);
}

/**
 * Applies a manual override (spec §11.4) and recomputes the score.
 */
export function applyManualOverride(
  card: QuestionCard,
  review: AnswerReview,
  rubricItemId: string,
  newStatus: RubricStatus,
  role: InterviewRole,
): AnswerReview {
  const previousStatus: RubricStatus = review.coveredRubricItemIds.includes(
    rubricItemId,
  )
    ? "covered"
    : review.weakRubricItemIds.includes(rubricItemId)
      ? "weak"
      : "missing";

  if (previousStatus === newStatus) return review;

  const without = (ids: string[]) => ids.filter((id) => id !== rubricItemId);
  const match: RubricMatchResult = {
    coveredRubricItemIds: without(review.coveredRubricItemIds),
    weakRubricItemIds: without(review.weakRubricItemIds),
    missingRubricItemIds: without(review.missingRubricItemIds),
  };
  if (newStatus === "covered") match.coveredRubricItemIds.push(rubricItemId);
  else if (newStatus === "weak") match.weakRubricItemIds.push(rubricItemId);
  else match.missingRubricItemIds.push(rubricItemId);

  const override: ManualRubricOverride = {
    rubricItemId,
    previousStatus,
    newStatus,
  };
  const totalScore = computeScore(card.expectedPoints, match, role);

  return {
    ...review,
    coveredRubricItemIds: match.coveredRubricItemIds,
    weakRubricItemIds: match.weakRubricItemIds,
    missingRubricItemIds: match.missingRubricItemIds,
    manualOverrides: [...review.manualOverrides, override],
    totalScore,
    scores: { ...review.scores, technicalCorrectness: totalScore },
    feedbackSummary: buildFeedbackSummary(card.expectedPoints, match),
  };
}

/**
 * Weak topics of a session: topics of questions scoring under 50% or with a
 * missing critical rubric item.
 */
export function collectWeakTopicIds(
  session: InterviewSession,
  cardsById: Map<string, QuestionCard>,
): string[] {
  const weak = new Set<string>();
  for (const q of session.questions) {
    if (!q.review) continue;
    const card = cardsById.get(q.questionCardId);
    if (!card) continue;
    const missedCritical = card.expectedPoints.some(
      (p) =>
        p.importance === "critical" &&
        q.review!.missingRubricItemIds.includes(p.id),
    );
    if (q.review.totalScore < 50 || missedCritical) {
      card.topicIds.forEach((t) => weak.add(t));
    }
  }
  return [...weak];
}

export function computeOverallScore(session: InterviewSession): number {
  const reviewed = session.questions.filter((q) => q.review);
  if (reviewed.length === 0) return 0;
  const sum = reviewed.reduce((acc, q) => acc + (q.review?.totalScore ?? 0), 0);
  return Math.round(sum / reviewed.length);
}
