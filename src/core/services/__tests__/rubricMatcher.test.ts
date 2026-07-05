import { describe, expect, it } from "vitest";
import type { RubricItem } from "@/core/models";
import { normalize, normalizedIncludes } from "../transcriptNormalizer";
import { matchRubric, matchRubricItem } from "../rubricMatcher";

const item: RubricItem = {
  id: "idempotency",
  label: "Mentions idempotency",
  description: "",
  importance: "critical",
  roleWeight: { backend_developer: 5 },
  acceptedSignals: ["idempotency", "safe retry", "idempotency key"],
  weakSignals: ["retry", "avoid duplicates"],
  negativeSignals: ["just retry until it works"],
};

describe("normalize", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalize("Cache-Aside, with TTL!")).toBe("cache aside with ttl");
  });

  it("matches on word boundaries only", () => {
    expect(normalizedIncludes("we keep retrying forever", "retry")).toBe(false);
    expect(normalizedIncludes("we retry with backoff", "retry")).toBe(true);
  });
});

describe("matchRubricItem", () => {
  it("returns covered for a strong signal regardless of punctuation/case", () => {
    expect(
      matchRubricItem("I would use an Idempotency-Key header.", item),
    ).toBe("covered");
  });

  it("returns weak when only a weak signal is present", () => {
    expect(matchRubricItem("The client can retry the call.", item)).toBe(
      "weak",
    );
  });

  it("returns missing when nothing matches", () => {
    expect(matchRubricItem("I would add more servers.", item)).toBe("missing");
  });

  it("downgrades covered to weak when a negative signal appears", () => {
    expect(
      matchRubricItem(
        "Idempotency matters but honestly I would just retry until it works.",
        item,
      ),
    ).toBe("weak");
  });
});

describe("matchRubric", () => {
  it("buckets each item exactly once", () => {
    const second: RubricItem = {
      ...item,
      id: "other",
      acceptedSignals: ["dead letter queue"],
      weakSignals: [],
      negativeSignals: [],
    };
    const result = matchRubric("We use an idempotency key.", [item, second]);
    expect(result.coveredRubricItemIds).toEqual(["idempotency"]);
    expect(result.missingRubricItemIds).toEqual(["other"]);
    expect(result.weakRubricItemIds).toEqual([]);
  });
});
