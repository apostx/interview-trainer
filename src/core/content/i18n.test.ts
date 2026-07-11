import { describe, expect, it } from "vitest";
import type { QuestionCard, Topic } from "@/core/models";
import {
  availableLanguages,
  localizeCard,
  localizeTopic,
} from "./i18n";

const topic: Topic = {
  id: "t1",
  name: "Backpressure",
  description: "English description",
  category: "architecture",
  relatedTopicIds: [],
  studyNotes: "## What is it?\n\nEnglish notes.",
  status: "can_explain",
  userConfidence: 3,
  i18n: {
    hu: { name: "Ellennyomás", studyNotes: "## Mi ez?\n\nMagyar jegyzet." },
    // description intentionally omitted → falls back to English
  },
};

const card: QuestionCard = {
  id: "c1",
  title: "English title",
  prompt: "English prompt",
  roles: ["backend_developer"],
  modes: ["concept_check"],
  topicIds: ["t1"],
  expectedDurationSeconds: 180,
  thinkingTimeSeconds: 45,
  expectedPoints: [
    { id: "p1", label: "En label", description: "En desc", importance: "critical", roleWeight: {}, acceptedSignals: ["x"] },
    { id: "p2", label: "Untranslated", description: "Stays", importance: "important", roleWeight: {}, acceptedSignals: ["y"] },
  ],
  followUps: [{ id: "f1", trigger: { type: "always" }, prompt: "En follow-up", expectedPoints: [] }],
  i18n: {
    hu: {
      title: "Magyar cím",
      expectedPoints: { p1: { label: "Hu címke" } }, // description omitted
      followUps: { f1: "Magyar utókérdés" },
      // prompt omitted → English
    },
  },
};

describe("localizeTopic", () => {
  it("returns the original for English", () => {
    expect(localizeTopic(topic, "en")).toEqual({
      name: "Backpressure",
      description: "English description",
      studyNotes: "## What is it?\n\nEnglish notes.",
    });
  });

  it("applies translations with per-field English fallback", () => {
    const hu = localizeTopic(topic, "hu");
    expect(hu.name).toBe("Ellennyomás");
    expect(hu.studyNotes).toContain("Magyar jegyzet");
    expect(hu.description).toBe("English description"); // omitted → fallback
  });

  it("falls back entirely for a language with no entry", () => {
    expect(localizeTopic(topic, "de").name).toBe("Backpressure");
  });
});

describe("localizeCard", () => {
  it("returns the same object for English (no copy)", () => {
    expect(localizeCard(card, "en")).toBe(card);
  });

  it("localizes title, rubric labels and follow-ups with fallback", () => {
    const hu = localizeCard(card, "hu");
    expect(hu.title).toBe("Magyar cím");
    expect(hu.prompt).toBe("English prompt"); // omitted → fallback
    expect(hu.expectedPoints[0].label).toBe("Hu címke");
    expect(hu.expectedPoints[0].description).toBe("En desc"); // omitted → fallback
    expect(hu.expectedPoints[1].label).toBe("Untranslated"); // no entry → original
    expect(hu.followUps[0].prompt).toBe("Magyar utókérdés");
  });
});

describe("availableLanguages", () => {
  it("lists English first plus every translated language", () => {
    expect(availableLanguages([topic], [card])).toEqual(["en", "hu"]);
  });

  it("is just English when nothing is translated", () => {
    const plain = { ...topic, i18n: undefined };
    const plainCard = { ...card, i18n: undefined };
    expect(availableLanguages([plain], [plainCard])).toEqual(["en"]);
  });
});
