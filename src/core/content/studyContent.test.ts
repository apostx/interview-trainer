import { describe, expect, it } from "vitest";
import type { Topic } from "@/core/models";
import { studyContentSchema } from "./schema";
import { localizeTopic, studySectionLabel } from "./i18n";

const VALID = {
  mentalModel: "Backpressure means a busy part of the system tells the sender to slow down.",
  problem: "Without it, waiting work keeps growing and the service may fail.",
  example: "An API handles 100 requests per second but receives 500; a bounded queue rejects the extra work instead of drowning.",
  howItWorks: ["The consumer signals how much it can take.", "The producer slows down or gets rejected."],
  commonMistakes: ["Calling any rate limit backpressure.", "Using an unbounded queue as the strategy."],
  keyTerms: [{ term: "bounded queue", definition: "a queue with a maximum capacity" }],
};

describe("studyContentSchema", () => {
  it("accepts a valid structured object", () => {
    expect(studyContentSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a migrated object without example", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.example;
    expect(studyContentSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects an over-long mentalModel and multi-paragraph mentalModel", () => {
    expect(
      studyContentSchema.safeParse({ ...VALID, mentalModel: "x".repeat(301) }).success,
    ).toBe(false);
    expect(
      studyContentSchema.safeParse({ ...VALID, mentalModel: "One.\n\nTwo." }).success,
    ).toBe(false);
  });

  it("rejects wrong item counts", () => {
    expect(
      studyContentSchema.safeParse({ ...VALID, howItWorks: ["only one"] }).success,
    ).toBe(false);
    expect(
      studyContentSchema.safeParse({ ...VALID, howItWorks: Array(6).fill("step") }).success,
    ).toBe(false);
    expect(
      studyContentSchema.safeParse({ ...VALID, commonMistakes: ["one"] }).success,
    ).toBe(false);
    expect(studyContentSchema.safeParse({ ...VALID, keyTerms: [] }).success).toBe(false);
  });

  it("rejects markdown headings inside structured fields", () => {
    expect(
      studyContentSchema.safeParse({ ...VALID, problem: "## What is it?\nnope" }).success,
    ).toBe(false);
  });

  it("rejects empty items and over-long terms", () => {
    expect(
      studyContentSchema.safeParse({
        ...VALID,
        keyTerms: [{ term: "x".repeat(61), definition: "d" }],
      }).success,
    ).toBe(false);
    expect(
      studyContentSchema.safeParse({ ...VALID, commonMistakes: ["ok", ""] }).success,
    ).toBe(false);
  });
});

function topicWith(i18n?: Topic["i18n"]): Topic {
  return {
    id: "t",
    name: "Backpressure",
    description: "d",
    category: "core",
    relatedTopicIds: [],
    studyNotes: "## What is it?\n\nLegacy text.",
    studyContent: VALID,
    status: "unknown",
    userConfidence: 1,
    i18n,
  };
}

describe("localizeTopic studyContent fallback", () => {
  it("returns both formats; the UI prefers studyContent when both exist", () => {
    const loc = localizeTopic(topicWith(), "en");
    expect(loc.studyContent).toEqual(VALID);
    expect(loc.studyNotes).toContain("Legacy text");
  });

  it("falls back per scalar field and replaces whole arrays", () => {
    const loc = localizeTopic(
      topicWith({
        hu: {
          studyContent: {
            mentalModel: "A backpressure azt jelenti, hogy a rendszer lassítást kér.",
            howItWorks: ["Első lépés.", "Második lépés."],
          },
        },
      }),
      "hu",
    );
    expect(loc.studyContent?.mentalModel).toContain("lassítást");
    // untranslated scalar falls back to English
    expect(loc.studyContent?.problem).toBe(VALID.problem);
    // provided array replaces the English array entirely (no index merge)
    expect(loc.studyContent?.howItWorks).toEqual(["Első lépés.", "Második lépés."]);
    // omitted array = complete English array
    expect(loc.studyContent?.commonMistakes).toEqual(VALID.commonMistakes);
    expect(loc.studyContent?.keyTerms).toEqual(VALID.keyTerms);
  });

  it("keeps English content when a language has no translation entry", () => {
    const loc = localizeTopic(topicWith(), "de");
    expect(loc.studyContent).toEqual(VALID);
  });
});

describe("studySectionLabel", () => {
  it("localizes headings and falls back to English", () => {
    expect(studySectionLabel("mentalModel", "en")).toBe("What is it?");
    expect(studySectionLabel("mentalModel", "hu")).toBe("Mi ez?");
    expect(studySectionLabel("commonMistakes", "hu")).toBe("Gyakori hibák");
    expect(studySectionLabel("example", "de")).toBe("Example");
  });
});
