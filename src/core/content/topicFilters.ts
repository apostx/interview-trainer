import type { InterviewRole } from "@/core/models";
import { TRACK_MEMBER_ROLES } from "@/core/models";
import type { RoleFilter } from "@/core/services/filterPrefs";
import type { Bank } from "./deriveBank";

/**
 * Per-topic metadata derived from a bank's questions. Practice items only
 * carry topic ids, so their role/importance filters go through the topics:
 * a topic's roles are the union of its questions'.
 */
export type TopicMeta = {
  rolesByTopic: Map<string, Set<InterviewRole>>;
  importanceByTopic: Map<string, number>;
  hasImportance: boolean;
};

export function topicMetaMaps(bank: Bank): TopicMeta {
  const rolesByTopic = new Map<string, Set<InterviewRole>>();
  for (const card of bank.questions) {
    for (const topicId of card.topicIds) {
      const roles = rolesByTopic.get(topicId) ?? new Set();
      for (const r of card.roles) roles.add(r);
      rolesByTopic.set(topicId, roles);
    }
  }
  const importanceByTopic = new Map(
    bank.topics
      .filter((t) => t.importance !== undefined)
      .map((t) => [t.id, t.importance as number]),
  );
  return {
    rolesByTopic,
    importanceByTopic,
    hasImportance: importanceByTopic.size > 0,
  };
}

/** Importance-level token for a topic: "5".."1", or "u" when unrated. */
export function importanceToken(importance: number | undefined): string {
  return importance === undefined ? "u" : String(importance);
}

/**
 * True when any of the topics satisfies all active filters (empty selections
 * match everything) — i.e. the item belongs to at least one topic that fits.
 */
export function topicIdsMatch(
  topicIds: string[],
  meta: TopicMeta,
  role: RoleFilter,
  imp: string[],
): boolean {
  return topicIds.some((id) => {
    if (role !== "all") {
      const members = TRACK_MEMBER_ROLES[role] ?? [role];
      const topicRoles = meta.rolesByTopic.get(id);
      if (!topicRoles || !members.some((m) => topicRoles.has(m))) return false;
    }
    if (
      imp.length > 0 &&
      !imp.includes(importanceToken(meta.importanceByTopic.get(id)))
    ) {
      return false;
    }
    return true;
  });
}
