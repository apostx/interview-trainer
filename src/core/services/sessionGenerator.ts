import type {
  InterviewMode,
  InterviewRole,
  InterviewSession,
  QuestionCard,
  Topic,
} from "@/core/models";

export type SessionConfig = {
  role: InterviewRole;
  durationMinutes: number;
  modes: InterviewMode[];
  focusTopicIds?: string[];
  includeWeakTopics: boolean;
  includeUnknownTopics: boolean;
};

export type SessionGenerationContext = {
  cards: QuestionCard[];
  topicsById: Map<string, Topic>;
  /** Topics of currently due spaced-repetition practice items. */
  dueTopicIds: Set<string>;
  /** Weak topics from recent sessions. */
  weakTopicIds: Set<string>;
  /** Recently asked cards, deprioritized for variety. */
  recentQuestionCardIds: Set<string>;
  random?: () => number;
};

/** Estimated wall-clock cost of a question incl. review overhead. */
function cardTimeCostSeconds(card: QuestionCard): number {
  return card.thinkingTimeSeconds + card.expectedDurationSeconds + 60;
}

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 8;

/**
 * Spec §14 priorities: due spaced-repetition items > weak topics >
 * role-critical topics > variety. Unknown topics are excluded unless the
 * user opted into learning mode.
 */
export function scoreCard(
  card: QuestionCard,
  config: SessionConfig,
  ctx: SessionGenerationContext,
): number {
  let score = 0;
  if (card.topicIds.some((t) => ctx.dueTopicIds.has(t))) score += 40;
  if (
    config.includeWeakTopics &&
    card.topicIds.some((t) => ctx.weakTopicIds.has(t))
  ) {
    score += 30;
  }
  if (config.focusTopicIds?.some((t) => card.topicIds.includes(t))) score += 25;
  const roleCritical = card.expectedPoints.some(
    (p) => p.importance === "critical" && (p.roleWeight[config.role] ?? 0) >= 5,
  );
  if (roleCritical) score += 15;
  if (ctx.recentQuestionCardIds.has(card.id)) score -= 30;
  score += (ctx.random ?? Math.random)() * 10;
  return score;
}

function isCandidate(
  card: QuestionCard,
  config: SessionConfig,
  ctx: SessionGenerationContext,
): boolean {
  if (!card.roles.includes(config.role)) return false;
  if (!card.modes.some((m) => config.modes.includes(m))) return false;
  if (!config.includeUnknownTopics) {
    const statuses = card.topicIds
      .map((t) => ctx.topicsById.get(t)?.status)
      .filter(Boolean);
    const allUnknown =
      statuses.length > 0 &&
      statuses.every((s) => s === "unknown" || s === "basic_understanding");
    if (allUnknown) return false;
  }
  return true;
}

export function selectQuestionCards(
  config: SessionConfig,
  ctx: SessionGenerationContext,
): QuestionCard[] {
  const candidates = ctx.cards.filter((c) => isCandidate(c, config, ctx));

  const scored = new Map(
    candidates.map((c) => [c.id, scoreCard(c, config, ctx)]),
  );

  // Round-robin across requested modes so the session mixes formats.
  const byMode = new Map<InterviewMode, QuestionCard[]>();
  for (const mode of config.modes) {
    byMode.set(
      mode,
      candidates
        .filter((c) => c.modes.includes(mode))
        .sort((a, b) => (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0)),
    );
  }

  const budgetSeconds = config.durationMinutes * 60;
  const picked: QuestionCard[] = [];
  const pickedIds = new Set<string>();
  let usedSeconds = 0;

  let progress = true;
  while (progress && picked.length < MAX_QUESTIONS) {
    progress = false;
    for (const mode of config.modes) {
      if (picked.length >= MAX_QUESTIONS) break;
      const pool = byMode.get(mode) ?? [];
      const next = pool.find((c) => !pickedIds.has(c.id));
      if (!next) continue;
      const cost = cardTimeCostSeconds(next);
      if (
        picked.length >= MIN_QUESTIONS &&
        usedSeconds + cost > budgetSeconds
      ) {
        continue;
      }
      picked.push(next);
      pickedIds.add(next.id);
      usedSeconds += cost;
      progress = true;
    }
  }

  return picked;
}

export function generateSession(
  config: SessionConfig,
  ctx: SessionGenerationContext,
  nowIso: string,
): InterviewSession {
  const cards = selectQuestionCards(config, ctx);
  const sessionId = `session_${Date.parse(nowIso)}_${Math.floor(
    (ctx.random ?? Math.random)() * 1e6,
  )}`;

  return {
    id: sessionId,
    role: config.role,
    modes: config.modes,
    startedAt: nowIso,
    targetDurationMinutes: config.durationMinutes,
    questions: cards.map((card, index) => ({
      id: `${sessionId}_q${index}`,
      questionCardId: card.id,
      status: "pending",
      followUpQuestionIds: [],
    })),
    weakTopicIds: [],
  };
}
