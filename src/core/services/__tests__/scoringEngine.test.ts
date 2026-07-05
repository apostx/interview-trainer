import { describe, expect, it } from "vitest";
import type { RubricItem } from "@/core/models";
import { computeScore, itemWeight, rubricStatusScore } from "../scoringEngine";

const critical: RubricItem = {
  id: "a",
  label: "A",
  description: "",
  importance: "critical",
  roleWeight: { backend_developer: 5 },
  acceptedSignals: [],
};

const niceToHave: RubricItem = {
  id: "b",
  label: "B",
  description: "",
  importance: "nice_to_have",
  roleWeight: { backend_developer: 5 },
  acceptedSignals: [],
};

describe("scoring", () => {
  it("maps rubric status to points", () => {
    expect(rubricStatusScore("covered")).toBe(1);
    expect(rubricStatusScore("weak")).toBe(0.5);
    expect(rubricStatusScore("missing")).toBe(0);
  });

  it("weights items by importance × role weight", () => {
    expect(itemWeight(critical, "backend_developer")).toBe(15);
    expect(itemWeight(niceToHave, "backend_developer")).toBe(5);
    // unspecified role falls back to the default weight of 3
    expect(itemWeight(critical, "frontend_developer")).toBe(9);
  });

  it("computes the weighted percentage", () => {
    // covered critical (15) + missing nice_to_have (0) out of 20 → 75%
    const score = computeScore(
      [critical, niceToHave],
      {
        coveredRubricItemIds: ["a"],
        weakRubricItemIds: [],
        missingRubricItemIds: ["b"],
      },
      "backend_developer",
    );
    expect(score).toBe(75);
  });

  it("scores weak items at half weight", () => {
    const score = computeScore(
      [critical],
      {
        coveredRubricItemIds: [],
        weakRubricItemIds: ["a"],
        missingRubricItemIds: [],
      },
      "backend_developer",
    );
    expect(score).toBe(50);
  });

  it("returns 0 for an empty rubric", () => {
    expect(
      computeScore(
        [],
        {
          coveredRubricItemIds: [],
          weakRubricItemIds: [],
          missingRubricItemIds: [],
        },
        "backend_developer",
      ),
    ).toBe(0);
  });
});
