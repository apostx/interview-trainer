import type { QuestionCard, Topic } from "@/core/models";
import { seedTopics } from "@/core/seed/topics";
import type { ContentPack } from "./schema";
import { toQuestionCard, toTopic } from "./schema";
import type { LoadedPack } from "./packs";

/**
 * Derives a complete, self-contained content bank from a set of parsed packs.
 * The same function builds the live bank and every alternate version, so a
 * version selected in the dev-mode switcher behaves exactly like the default.
 */

export type ContentSource = { id: string; name: string; group: string };

export type Bank = {
  topics: Topic[];
  questions: QuestionCard[];
  /** File-level dataresource sources of every question. */
  sourcesByCardId: Map<string, string[]>;
  /** Selectable sources with their dropdown group. */
  contentSources: ContentSource[];
  getCard: (id: string) => QuestionCard | undefined;
  errors: string[];
};

function mergeById<T extends { id: string }>(
  base: T[],
  extra: T[],
  kind: string,
  errors: string[],
): T[] {
  const merged = [...base];
  const seen = new Set(base.map((item) => item.id));
  for (const item of extra) {
    if (seen.has(item.id)) {
      errors.push(`duplicate ${kind} id "${item.id}" — pack entry skipped`);
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function buildContentSources(
  sourcesByCardId: Map<string, string[]>,
  packNameById: Map<string, string>,
): ContentSource[] {
  return [...new Set([...sourcesByCardId.values()].flat())].sort().map((id) => {
    const packName = packNameById.get(id);
    if (packName) return { id, name: packName, group: "" };
    const slash = id.indexOf("/");
    return slash > 0
      ? { id, name: id.slice(slash + 1), group: id.slice(0, slash) }
      : { id, name: id, group: "" };
  });
}

export function deriveBank(packs: ContentPack[], loadedPacks: LoadedPack[]): Bank {
  const errors: string[] = [];
  const packTopics: Topic[] = [];
  const packQuestions: QuestionCard[] = [];
  const sourcesByQuestionId = new Map<string, string[]>();

  for (const pack of packs) {
    packTopics.push(...pack.topics.map(toTopic));
    for (const q of pack.questions) {
      packQuestions.push(toQuestionCard(q));
      const sources = q.sources && q.sources.length > 0 ? q.sources : pack.sources;
      sourcesByQuestionId.set(q.id, sources.length > 0 ? sources : [pack.id]);
    }
  }

  // Packs are the content authority: a pack topic (with studyNotes,
  // importance, …) overrides the bare seed-taxonomy entry with the same id.
  // The seed only fills ids no pack defines, so packs can keep referencing
  // shared taxonomy ids. Duplicates BETWEEN packs still error.
  const packMerged = mergeById<Topic>([], packTopics, "topic", errors);
  const packTopicIds = new Set(packMerged.map((t) => t.id));
  const topics = [
    ...packMerged,
    ...seedTopics.filter((t) => !packTopicIds.has(t.id)),
  ];
  const questions = mergeById<QuestionCard>([], packQuestions, "question", errors);
  const sourcesByCardId = new Map<string, string[]>(
    questions.map((q) => [q.id, sourcesByQuestionId.get(q.id) ?? ["unknown"]]),
  );
  const packNameById = new Map(loadedPacks.map((p) => [p.id, p.name]));
  const contentSources = buildContentSources(sourcesByCardId, packNameById);
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  return {
    topics,
    questions,
    sourcesByCardId,
    contentSources,
    getCard: (id) => questionsById.get(id),
    errors,
  };
}
