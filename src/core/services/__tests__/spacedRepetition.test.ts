import { describe, expect, it } from "vitest";
import type { PracticeItem } from "@/core/models";
import {
  applyPracticeReview,
  calculateNextReview,
  generatePracticeItemsFromReview,
  isDue,
} from "../spacedRepetition";
import { reviewAnswer } from "../answerReviewer";
import { getQuestionCard } from "@/core/seed/questions";

describe("calculateNextReview", () => {
  it("resets to 1 day on failure", () => {
    expect(calculateNextReview(0, 10)).toBe(1);
    expect(calculateNextReview(1, 10)).toBe(1);
  });

  it("grows the interval with the score", () => {
    expect(calculateNextReview(2, 10)).toBe(12);
    expect(calculateNextReview(3, 10)).toBe(20);
    expect(calculateNextReview(4, 10)).toBe(30);
    expect(calculateNextReview(5, 10)).toBe(40);
  });
});

describe("applyPracticeReview", () => {
  const item: PracticeItem = {
    id: "p1",
    type: "concept_card",
    topicIds: ["idempotency"],
    prompt: "Explain idempotency.",
    expectedPoints: [],
    nextReviewAt: "2026-07-01T00:00:00.000Z",
    intervalDays: 2,
    easeFactor: 2.5,
    reviewHistory: [],
  };

  it("reschedules and records history", () => {
    const updated = applyPracticeReview(item, {
      reviewedAt: "2026-07-04T00:00:00.000Z",
      score: 4,
    });
    expect(updated.intervalDays).toBe(6);
    expect(updated.nextReviewAt).toBe("2026-07-10T00:00:00.000Z");
    expect(updated.reviewHistory).toHaveLength(1);
  });

  it("marks items due by date", () => {
    expect(isDue(item, "2026-07-04T00:00:00.000Z")).toBe(true);
    expect(isDue(item, "2026-06-30T00:00:00.000Z")).toBe(false);
  });
});

describe("generatePracticeItemsFromReview", () => {
  it("creates one item per missed critical rubric point, due immediately", () => {
    const card = getQuestionCard("design_notification_001")!;
    // Answer that covers the queue but misses idempotency/DLQ/etc.
    const { review } = reviewAnswer(
      card,
      "I would put a message queue between the services and monitor it with metrics and alerting.",
      "backend_architect",
      "2026-07-04T00:00:00.000Z",
    );
    const items = generatePracticeItemsFromReview(
      card,
      review,
      "2026-07-04T00:00:00.000Z",
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.nextReviewAt).toBe("2026-07-04T00:00:00.000Z");
      expect(item.expectedPoints).toHaveLength(1);
      expect(item.expectedPoints[0].importance).toBe("critical");
      expect(review.missingRubricItemIds).toContain(item.expectedPoints[0].id);
    }
  });
});
