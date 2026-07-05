import type { QuestionCard, Topic } from "@/core/models";
import { seedQuestions } from "@/core/seed/questions";
import { seedTopics } from "@/core/seed/topics";
import { loadedPacks, packErrors, packQuestions, packTopics } from "./packs";

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

export { loadedPacks, packErrors };
