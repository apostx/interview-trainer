import type {
  AnswerReview,
  InterviewRole,
  InterviewSession,
  ManualRubricOverride,
  PracticeItem,
  QuestionCard,
  RubricStatus,
} from "@/core/models";
import { matchRubric, type RubricMatchResult } from "./rubricMatcher";
import { buildFeedbackSummary, computeScore } from "./scoringEngine";
import {
  generatePracticeItemsFromReview,
  toGeneratedPracticeItem,
} from "./spacedRepetition";

/**
 * Runs the full hybrid review pipeline for one answer (spec §11 MVP scope:
 * deterministic matching + manual override; AI review comes later).
 */
export function reviewAnswer(
  card: QuestionCard,
  transcript: string,
  role: InterviewRole,
  nowIso: string,
): { review: AnswerReview; practiceItems: PracticeItem[] } {
  const match = matchRubric(transcript, card.expectedPoints);
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
  };

  const practiceItems = generatePracticeItemsFromReview(card, review, nowIso);
  review.generatedPracticeItems = practiceItems.map(toGeneratedPracticeItem);

  return { review, practiceItems };
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
