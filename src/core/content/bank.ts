import type { QuestionCard, Topic } from "@/core/models";
import { seedTopics } from "@/core/seed/topics";
import {
  loadedPacks,
  packErrors,
  packQuestions,
  packTopics,
  sourcesByQuestionId,
} from "./packs";

/**
 * The content bank: every valid content pack from `content/packs/` — all
 * questions come from the dataresource-derived packs. The seed topics remain
 * only as shared taxonomy that packs can reference. Duplicate ids keep the
 * first occurrence and are reported as pack errors.
 */

function mergeById<T extends { id: string }>(
  base: T[],
  extra: T[],
  kind: string,
): T[] {
  const merged = [...base];
  const seen = new Set(base.map((item) => item.id));
  for (const item of extra) {
    if (seen.has(item.id)) {
      packErrors.push(`duplicate ${kind} id "${item.id}" — pack entry skipped`);
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

export const allTopics: Topic[] = mergeById(seedTopics, packTopics, "topic");
export const allQuestions: QuestionCard[] = mergeById(
  [],
  packQuestions,
  "question",
);

const questionsById = new Map(allQuestions.map((q) => [q.id, q]));

export function getCard(id: string): QuestionCard | undefined {
  return questionsById.get(id);
}

/** File-level sources of every question (dataresource paths). */
export const sourcesByCardId = new Map<string, string[]>(
  allQuestions.map((q) => [
    q.id,
    sourcesByQuestionId.get(q.id) ?? ["unknown"],
  ]),
);

const packNameById = new Map(loadedPacks.map((p) => [p.id, p.name]));

/**
 * All selectable sources with their dropdown group. dataresource/ is the
 * data root: files living there directly get an empty group (rendered flat),
 * subfolders group by name.
 */
export type ContentSource = { id: string; name: string; group: string };
export const contentSources: ContentSource[] = [
  ...new Set([...sourcesByCardId.values()].flat()),
]
  .sort()
  .map((id) => {
    const packName = packNameById.get(id);
    if (packName) return { id, name: packName, group: "" };
    const slash = id.indexOf("/");
    return slash > 0
      ? { id, name: id.slice(slash + 1), group: id.slice(0, slash) }
      : { id, name: id, group: "" };
  });

export { loadedPacks, packErrors };
