import { describe, expect, it } from "vitest";
import { generateSession, type SessionConfig, type SessionGenerationContext } from "../sessionGenerator";
import { seedQuestions } from "@/core/seed/questions";
import { seedTopics } from "@/core/seed/topics";

const topicsById = new Map(seedTopics.map((t) => [t.id, t]));

function makeContext(
  overrides: Partial<SessionGenerationContext> = {},
): SessionGenerationContext {
  return {
    cards: seedQuestions,
    topicsById,
    dueTopicIds: new Set(),
    weakTopicIds: new Set(),
    recentQuestionCardIds: new Set(),
    random: () => 0.5,
    ...overrides,
  };
}

const baseConfig: SessionConfig = {
  role: "backend_developer",
  durationMinutes: 30,
  modes: ["concept_check", "scenario_discussion", "tradeoff_decision", "troubleshooting", "system_design"],
  includeWeakTopics: true,
  includeUnknownTopics: false,
};

describe("generateSession", () => {
  it("only picks cards matching role and modes", () => {
    const session = generateSession(baseConfig, makeContext(), "2026-07-04T00:00:00.000Z");
    expect(session.questions.length).toBeGreaterThanOrEqual(3);
    for (const q of session.questions) {
      const card = seedQuestions.find((c) => c.id === q.questionCardId)!;
      expect(card.roles).toContain("backend_developer");
      expect(card.modes.some((m) => baseConfig.modes.includes(m))).toBe(true);
    }
  });

  it("mixes modes across the session", () => {
    const session = generateSession(baseConfig, makeContext(), "2026-07-04T00:00:00.000Z");
    const modes = new Set(
      session.questions.map(
        (q) => seedQuestions.find((c) => c.id === q.questionCardId)!.modes[0],
      ),
    );
    expect(modes.size).toBeGreaterThan(1);
  });

  it("stays within the time budget after the minimum question count", () => {
    const shortConfig = { ...baseConfig, durationMinutes: 15 };
    const session = generateSession(shortConfig, makeContext(), "2026-07-04T00:00:00.000Z");
    const totalSeconds = session.questions
      .map((q) => seedQuestions.find((c) => c.id === q.questionCardId)!)
      .reduce((acc, c) => acc + c.thinkingTimeSeconds + c.expectedDurationSeconds + 60, 0);
    // min 3 questions are always allowed; beyond that the budget must hold
    if (session.questions.length > 3) {
      expect(totalSeconds).toBeLessThanOrEqual(15 * 60);
    }
    expect(session.questions.length).toBeGreaterThanOrEqual(3);
  });

  it("prioritizes weak-topic cards when enabled", () => {
    const ctx = makeContext({ weakTopicIds: new Set(["idempotency"]) });
    const session = generateSession(
      { ...baseConfig, durationMinutes: 15 },
      ctx,
      "2026-07-04T00:00:00.000Z",
    );
    const pickedTopicIds = session.questions.flatMap(
      (q) => seedQuestions.find((c) => c.id === q.questionCardId)!.topicIds,
    );
    expect(pickedTopicIds).toContain("idempotency");
  });

  it("excludes cards whose topics are all unknown unless learning mode is on", () => {
    const unknownTopics = new Map(
      seedTopics.map((t) => [
        t.id,
        t.id === "websocket" || t.id === "api_integration"
          ? { ...t, status: "unknown" as const }
          : t,
      ]),
    );
    const ctx = makeContext({ topicsById: unknownTopics });
    const session = generateSession(baseConfig, ctx, "2026-07-04T00:00:00.000Z");
    const ids = session.questions.map((q) => q.questionCardId);
    expect(ids).not.toContain("tradeoff_websocket_001");
  });
});
