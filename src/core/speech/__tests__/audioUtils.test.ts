import { describe, expect, it } from "vitest";
import {
  cleanTranscript,
  collapseRepeatedWords,
  fixDomainTerms,
  isDegenerateTranscript,
  normalizePeak,
  peakLevel,
} from "../audioUtils";
import { buildVocabularyPrompt } from "../cloudTranscriber";

describe("peakLevel / normalizePeak", () => {
  it("finds the loudest absolute sample", () => {
    expect(peakLevel(new Float32Array([0.1, -0.5, 0.3]))).toBe(0.5);
  });

  it("boosts quiet audio to the target peak", () => {
    const pcm = normalizePeak(new Float32Array([0.05, -0.1]), 0.9);
    expect(peakLevel(pcm)).toBeCloseTo(0.9, 5);
  });

  it("leaves silence and already-loud audio untouched", () => {
    const silent = new Float32Array([0.001, -0.002]);
    expect(peakLevel(normalizePeak(silent))).toBeCloseTo(0.002, 5);
    const loud = new Float32Array([0.95]);
    expect(peakLevel(normalizePeak(loud))).toBeCloseTo(0.95, 5);
  });
});

describe("transcript cleanup", () => {
  it("collapses long word runs but keeps normal text", () => {
    expect(collapseRepeatedWords("you you you you know the drill")).toBe(
      "you you know the drill",
    );
    expect(collapseRepeatedWords("I would use an idempotency key")).toBe(
      "I would use an idempotency key",
    );
  });

  it("detects hallucinated transcripts", () => {
    expect(isDegenerateTranscript("you you you you you")).toBe(true);
    expect(isDegenerateTranscript("Thank you. Thank you. Thank you.")).toBe(true);
    expect(isDegenerateTranscript("You")).toBe(true);
    expect(isDegenerateTranscript("Thanks for watching!")).toBe(true);
    expect(isDegenerateTranscript("")).toBe(true);
    expect(isDegenerateTranscript("It depends on the requirements")).toBe(false);
    // short legit answers survive
    expect(isDegenerateTranscript("use caching")).toBe(false);
  });

  it("cleanTranscript maps hallucination to empty and cleans loops", () => {
    expect(cleanTranscript("you you you you")).toBe("");
    expect(cleanTranscript("  Thank you. Thank you.  ")).toBe("");
    expect(cleanTranscript("caching caching caching helps with latency")).toBe(
      "caching caching helps with latency",
    );
  });
});

describe("fixDomainTerms", () => {
  it("repairs split and misheard technical terms", () => {
    expect(fixDomainTerms("we use a web hook for callbacks")).toBe(
      "we use a webhook for callbacks",
    );
    expect(fixDomainTerms("I would use that book to notify them")).toBe(
      "I would use webhook to notify them",
    );
    expect(fixDomainTerms("store it in the cash and use no sequel")).toBe(
      "store it in the cache and use NoSQL",
    );
    expect(fixDomainTerms("cashing the results with micro services")).toBe(
      "caching the results with microservices",
    );
  });

  it("respects word boundaries", () => {
    expect(fixDomainTerms("the consequel remains")).toBe("the consequel remains");
    expect(fixDomainTerms("sequels are fine")).toBe("sequels are fine");
  });
});

describe("buildVocabularyPrompt", () => {
  it("puts question terms first and dedupes against the glossary", () => {
    const prompt = buildVocabularyPrompt(["outbox table", "webhook", "Webhook"]);
    expect(prompt).toContain("outbox table");
    expect(prompt.indexOf("outbox table")).toBeLessThan(prompt.indexOf("WebSocket"));
    expect(prompt.match(/webhook/gi)?.length).toBe(1);
  });

  it("stays within the whisper prompt budget", () => {
    const many = Array.from({ length: 300 }, (_, i) => `term number ${i}`);
    expect(buildVocabularyPrompt(many).length).toBeLessThanOrEqual(710);
  });
});
