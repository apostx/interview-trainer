import type { QuestionCard, Topic } from "@/core/models";
import {
  contentPackSchema,
  formatZodError,
  toQuestionCard,
  toTopic,
} from "./schema";

/**
 * Auto-discovers content packs: every `.json` file dropped into
 * `content/packs/` is bundled, validated against the pack schema and merged
 * into the question/topic bank at build time (hot-reloaded in dev).
 * Invalid packs are skipped and reported via `packErrors` (shown on the
 * Topics page) instead of breaking the app.
 */

export type LoadedPack = {
  id: string;
  name: string;
  fileName: string;
  topicCount: number;
  questionCount: number;
};

export const loadedPacks: LoadedPack[] = [];
export const packErrors: string[] = [];
export const packTopics: Topic[] = [];
export const packQuestions: QuestionCard[] = [];

function tryLoadContext(): RequireContext | null {
  try {
    // Statically analyzed by the bundler; unavailable in plain Node (tests).
    return require.context("../../../content/packs", false, /\.json$/);
  } catch {
    return null;
  }
}

const context = tryLoadContext();
if (context) {
  const seenPackIds = new Set<string>();
  for (const key of context.keys().sort()) {
    const fileName = key.replace(/^\.\//, "");
    let raw: unknown;
    try {
      raw = context(key);
    } catch (e) {
      packErrors.push(`${fileName}: not valid JSON (${String(e)})`);
      continue;
    }
    const parsed = contentPackSchema.safeParse(raw);
    if (!parsed.success) {
      packErrors.push(`${fileName}: ${formatZodError(parsed.error)}`);
      continue;
    }
    const pack = parsed.data;
    if (seenPackIds.has(pack.id)) {
      packErrors.push(`${fileName}: duplicate pack id "${pack.id}" — skipped`);
      continue;
    }
    seenPackIds.add(pack.id);
    packTopics.push(...pack.topics.map(toTopic));
    packQuestions.push(...pack.questions.map(toQuestionCard));
    loadedPacks.push({
      id: pack.id,
      name: pack.name,
      fileName,
      topicCount: pack.topics.length,
      questionCount: pack.questions.length,
    });
  }
}
