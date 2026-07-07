import type { QuestionCard, Topic } from "@/core/models";
import { seedQuestions } from "@/core/seed/questions";
import { seedTopics } from "@/core/seed/topics";
import {
  loadedPacks,
  packErrors,
  packQuestions,
  packTopics,
  sourcesByQuestionId,
} from "./packs";

/**
 * The merged content bank: built-in seed content + every valid content pack
 * from `content/packs/`. Duplicate ids keep the first occurrence (seed wins)
 * and are reported as pack errors.
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
  seedQuestions,
  packQuestions,
  "question",
);

const questionsById = new Map(allQuestions.map((q) => [q.id, q]));

export function getCard(id: string): QuestionCard | undefined {
  return questionsById.get(id);
}

/** File-level sources of every question (dataresource paths or "seed"). */
export const SEED_SOURCE_ID = "seed";
export const sourcesByCardId = new Map<string, string[]>(
  allQuestions.map((q) => [
    q.id,
    sourcesByQuestionId.get(q.id) ?? [SEED_SOURCE_ID],
  ]),
);

const packNameById = new Map(loadedPacks.map((p) => [p.id, p.name]));

/**
 * All selectable sources with their dropdown group: the app's own content
 * ("app"), root dataresource files ("dataresource"), and folders by name.
 */
export type ContentSource = { id: string; name: string; group: string };
export const contentSources: ContentSource[] = [
  { id: SEED_SOURCE_ID, name: "Built-in seed", group: "app" },
  ...[...new Set([...sourcesByCardId.values()].flat())]
    .filter((id) => id !== SEED_SOURCE_ID)
    .sort()
    .map((id) => {
      const packName = packNameById.get(id);
      if (packName) return { id, name: packName, group: "app" };
      const slash = id.indexOf("/");
      return slash > 0
        ? { id, name: id.slice(slash + 1), group: id.slice(0, slash) }
        : { id, name: id, group: "dataresource" };
    }),
];

export { loadedPacks, packErrors };
