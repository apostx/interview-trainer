import { describe, expect, it } from "vitest";
import {
  cleanTranscript,
  collapseRepeatedWords,
  isDegenerateTranscript,
  normalizePeak,
  peakLevel,
} from "../audioUtils";

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
