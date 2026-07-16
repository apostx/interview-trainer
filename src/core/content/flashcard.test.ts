import { describe, expect, it } from "vitest";
import type { QuestionCard } from "@/core/models";
import { questionFlashcardSchema } from "./schema";
import { localizeCard } from "./i18n";

describe("questionFlashcardSchema", () => {
  it("accepts short answers and mistakes within limits", () => {
    expect(
      questionFlashcardSchema.safeParse({
        shortAnswer: "Backpressure means the receiver asks the sender to slow down, so I would bound the queue and reject overflow.",
        commonMistake: "Describing any rate limit as backpressure.",
      }).success,
    ).toBe(true);
  });

  it("accepts either field alone (both optional)", () => {
    expect(questionFlashcardSchema.safeParse({}).success).toBe(true);
    expect(
      questionFlashcardSchema.safeParse({ commonMistake: "Only this." }).success,
    ).toBe(true);
  });

  it("rejects over-long fields and headings", () => {
    expect(
      questionFlashcardSchema.safeParse({ shortAnswer: "x".repeat(451) }).success,
    ).toBe(false);
    expect(
      questionFlashcardSchema.safeParse({ commonMistake: "x".repeat(301) }).success,
    ).toBe(false);
    expect(
      questionFlashcardSchema.safeParse({ shortAnswer: "## Heading\nno" }).success,
    ).toBe(false);
  });
});

describe("localizeCard flashcard fallback", () => {
  const card: QuestionCard = {
    id: "q",
    title: "T",
    prompt: "P",
    roles: ["backend_developer"],
    modes: ["concept_check"],
    topicIds: ["t"],
    expectedDurationSeconds: 180,
    thinkingTimeSeconds: 45,
    expectedPoints: [],
    followUps: [],
    flashcard: { shortAnswer: "English answer.", commonMistake: "English mistake." },
    i18n: { hu: { flashcard: { shortAnswer: "Magyar válasz." } } },
  };

  it("falls back per field inside flashcard", () => {
    const loc = localizeCard(card, "hu");
    expect(loc.flashcard?.shortAnswer).toBe("Magyar válasz.");
    expect(loc.flashcard?.commonMistake).toBe("English mistake.");
  });

  it("returns the original for English", () => {
    expect(localizeCard(card, "en").flashcard?.shortAnswer).toBe("English answer.");
  });
});
