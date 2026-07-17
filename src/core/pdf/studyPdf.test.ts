import { describe, expect, it } from "vitest";
import type { QuestionCard, Topic } from "@/core/models";
import {
  buildFlashcardsDefinition,
  buildTrueFlashcardsDefinition,
} from "./studyPdf";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Flattens every text node of a pdfmake definition into one string. */
function collectText(node: any): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join("\n");
  const parts: string[] = [];
  if ("text" in node) parts.push(collectText(node.text));
  if ("stack" in node) parts.push(collectText(node.stack));
  if ("ul" in node) parts.push(collectText(node.ul));
  if ("columns" in node) parts.push(collectText(node.columns));
  return parts.join("\n");
}

function topic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "t1",
    name: "Backpressure",
    description: "How a slower consumer signals a faster producer.",
    category: "core",
    relatedTopicIds: [],
    importance: 4,
    studyContent: {
      mentalModel: "Backpressure means the receiver asks the sender to slow down.",
      problem: "Without it, waiting work keeps growing and the service may fail.",
      example: "A full queue rejects new work instead of drowning.",
      howItWorks: ["The receiver signals capacity.", "The sender slows down."],
      commonMistakes: [
        "TOPIC-LEVEL MISTAKE that must never leak onto question cards.",
        "Second topic-level mistake.",
      ],
      keyTerms: [{ term: "bounded queue", definition: "a queue with a maximum capacity" }],
    },
    status: "unknown",
    userConfidence: 1,
    ...overrides,
  };
}

function question(overrides: Partial<QuestionCard> = {}): QuestionCard {
  return {
    id: "q1",
    title: "Backpressure basics",
    prompt: "What is backpressure and when do you need it?",
    roles: ["backend_developer"],
    modes: ["concept_check"],
    topicIds: ["t1"],
    expectedDurationSeconds: 180,
    thinkingTimeSeconds: 45,
    expectedPoints: [
      {
        id: "p1",
        label: "Defines the signal",
        description: "Receiver tells the sender to slow down.",
        importance: "critical",
        roleWeight: {},
        acceptedSignals: ["slow down"],
      },
    ],
    followUps: [],
    ...overrides,
  };
}

function flashText(topics: Topic[], questions: QuestionCard[], lang = "en"): string {
  return collectText(
    buildTrueFlashcardsDefinition({ topics, questions, lang }).content,
  );
}

describe("true flashcards (front/back)", () => {
  it("renders an authored shortAnswer under SHORT ANSWER, before KEY POINTS", () => {
    const text = flashText(
      [topic()],
      [question({ flashcard: { shortAnswer: "I would bound the queue and reject overflow." } })],
    );
    expect(text).toContain("SHORT ANSWER");
    expect(text).toContain("I would bound the queue and reject overflow.");
    expect(text.indexOf("SHORT ANSWER")).toBeLessThan(text.indexOf("KEY POINTS"));
  });

  it("falls back to a short sampleStrongAnswer, deterministically", () => {
    const text = flashText(
      [topic()],
      [question({ sampleStrongAnswer: "Backpressure lets the receiver push back on the producer." })],
    );
    expect(text).toContain("SHORT ANSWER");
    expect(text).toContain("push back on the producer");
  });

  it("omits the SHORT ANSWER heading entirely when nothing usable exists", () => {
    const text = flashText(
      [topic()],
      [question({ sampleStrongAnswer: "x".repeat(500) })],
    );
    expect(text).not.toContain("SHORT ANSWER");
  });

  it("uses question-level commonMistake with precedence over sampleWeakAnswer", () => {
    const text = flashText(
      [topic()],
      [
        question({
          flashcard: { commonMistake: "Calling any rate limit backpressure." },
          sampleWeakAnswer: "Weak answer text.",
        }),
      ],
    );
    expect(text).toContain("COMMON MISTAKE");
    expect(text).toContain("Calling any rate limit backpressure.");
    expect(text).not.toContain("Weak answer text.");
  });

  it("falls back to a short sampleWeakAnswer when no flashcard mistake exists", () => {
    const text = flashText([topic()], [question({ sampleWeakAnswer: "Just says 'add a cache'." })]);
    expect(text).toContain("COMMON MISTAKE");
    expect(text).toContain("add a cache");
  });

  it("never inherits topic-level mistakes and never renders an empty heading", () => {
    const text = flashText([topic()], [question()]);
    expect(text).not.toContain("TOPIC-LEVEL MISTAKE");
    expect(text).not.toContain("COMMON MISTAKE");
  });

  it("renders importance as font-safe text and never uses the star glyph", () => {
    const text = flashText([topic()], [question()]);
    expect(text).toContain("IMPORTANCE 4 / 5");
    expect(text).not.toContain("★");
  });

  it("numbers front/back pairs in the footer", () => {
    const def = buildTrueFlashcardsDefinition({
      topics: [topic()],
      questions: [question(), question({ id: "q2", prompt: "Second question?" })],
    });
    expect(def.footer(2, 5).text).toBe("Card 1 / 2 — Front");
    expect(def.footer(3, 5).text).toBe("Card 1 / 2 — Back");
    expect(def.footer(5, 5).text).toBe("Card 2 / 2 — Back");
    expect(def.footer(1, 5)).toBeUndefined();
  });

  it("renders the Hungarian flashcard translation", () => {
    const text = flashText(
      [topic()],
      [
        question({
          flashcard: { shortAnswer: "English answer." },
          i18n: { hu: { flashcard: { shortAnswer: "Magyar válasz." } } },
        }),
      ],
      "hu",
    );
    expect(text).toContain("Magyar válasz.");
    expect(text).not.toContain("English answer.");
  });
});

describe("topic cards (single-page deck)", () => {
  it("keeps WHY IT MATTERS and caps long term lists with an explicit indicator", () => {
    const bigTopic = topic({
      studyContent: {
        mentalModel: "m".repeat(150),
        problem: "p".repeat(300),
        example: "e",
        howItWorks: ["a", "b"],
        commonMistakes: ["m1", "m2"],
        keyTerms: Array.from({ length: 5 }, (_, i) => ({
          term: `term-${i}`,
          definition: "d".repeat(80),
        })),
      },
    });
    const text = collectText(
      buildFlashcardsDefinition({ topics: [bigTopic], questions: [question()] }).content,
    );
    expect(text).toContain("WHY IT MATTERS");
    expect(text).toContain("+ 2 more key terms — see the topic in Study");
    expect(text).toContain("term-0");
    expect(text).not.toContain("term-4");
  });

  it("omits WHY IT MATTERS cleanly when no problem content exists", () => {
    const bare = topic({ studyContent: undefined, studyNotes: undefined });
    const text = collectText(
      buildFlashcardsDefinition({ topics: [bare], questions: [question()] }).content,
    );
    expect(text).not.toContain("WHY IT MATTERS");
    expect(text).toContain("How a slower consumer signals a faster producer.");
  });
});
