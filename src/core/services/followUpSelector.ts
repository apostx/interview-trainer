import type { FollowUpQuestion, QuestionCard, Topic } from "@/core/models";
import type { RubricMatchResult } from "./rubricMatcher";
import { normalizedIncludes } from "./transcriptNormalizer";

/**
 * Follow-up selection (spec §13): prefer probing the most important weakness,
 * then dig into topics the candidate brought up. At most `limit` follow-ups
 * (1 in the MVP flow).
 *
 * Priority: missing critical rubric item > mentioned topic > covered rubric
 * item (dig deeper) > always.
 */
export function selectFollowUps(
  card: QuestionCard,
  transcript: string,
  result: RubricMatchResult,
  topicsById: Map<string, Topic>,
  limit = 1,
): FollowUpQuestion[] {
  const criticalMissing = new Set(
    card.expectedPoints
      .filter((i) => i.importance === "critical")
      .map((i) => i.id)
      .filter((id) => result.missingRubricItemIds.includes(id)),
  );

  const triggered = (f: FollowUpQuestion): number | null => {
    switch (f.trigger.type) {
      case "rubric_missing": {
        const id = f.trigger.rubricItemId;
        if (!result.missingRubricItemIds.includes(id)) return null;
        return criticalMissing.has(id) ? 0 : 1;
      }
      case "topic_mentioned": {
        const topic = topicsById.get(f.trigger.topicId);
        if (!topic) return null;
        return normalizedIncludes(transcript, topic.name) ||
          normalizedIncludes(transcript, f.trigger.topicId)
          ? 2
          : null;
      }
      case "rubric_covered":
        return result.coveredRubricItemIds.includes(f.trigger.rubricItemId)
          ? 3
          : null;
      case "always":
        return 4;
    }
  };

  return card.followUps
    .map((f) => ({ f, priority: triggered(f) }))
    .filter((x): x is { f: FollowUpQuestion; priority: number } => x.priority !== null)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit)
    .map((x) => x.f);
}
