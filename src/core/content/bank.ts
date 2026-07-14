import type { QuestionCard, Topic } from "@/core/models";
import { contentPackSchema, formatZodError, looksLikePack } from "./schema";
import type { ContentPack } from "./schema";
import {
  defaultLoadedPacks,
  defaultPackErrors,
  defaultPacks,
  type LoadedPack,
} from "./packs";
import { type Bank, type ContentSource, deriveBank } from "./deriveBank";

/**
 * The live content bank (from `content/packs/`) plus any alternate versions
 * under `content/versions/<label>/` used by the Study dev-mode switcher.
 */

export type { Bank, ContentSource };

/** The live bank as a single object (used by the dev-mode version list). */
export const liveBank: Bank = deriveBank(defaultPacks, defaultLoadedPacks);

export const allTopics: Topic[] = liveBank.topics;
export const allQuestions: QuestionCard[] = liveBank.questions;
export const sourcesByCardId = liveBank.sourcesByCardId;
export const contentSources = liveBank.contentSources;
export const getCard = (id: string): QuestionCard | undefined =>
  liveBank.getCard(id);
export const loadedPacks = defaultLoadedPacks;
export const packErrors = [...defaultPackErrors, ...liveBank.errors];

/** A selectable content bank in the dev-mode comparison switcher. */
export type ContentVersion = { label: string; bank: Bank };

function loadVersions(): ContentVersion[] {
  let context: RequireContext;
  try {
    // Recursive: keys look like "./<label>/<pack>.json".
    context = require.context("../../../content/versions", true, /\.json$/);
  } catch {
    return [];
  }
  const groups = new Map<
    string,
    { packs: ContentPack[]; loaded: LoadedPack[]; seen: Set<string>; errors: string[] }
  >();
  for (const key of context.keys().sort()) {
    const m = key.match(/^\.\/([^/]+)\/(.+\.json)$/);
    if (!m) continue;
    const [, label, fileName] = m;
    const g =
      groups.get(label) ??
      { packs: [], loaded: [], seen: new Set<string>(), errors: [] };
    groups.set(label, g);
    let raw: unknown;
    try {
      raw = context(key);
    } catch (e) {
      g.errors.push(`${fileName}: not valid JSON (${String(e)})`);
      continue;
    }
    // Ignore non-pack sidecar files (audits/manifests) that lack an id.
    if (!looksLikePack(raw)) continue;
    const parsed = contentPackSchema.safeParse(raw);
    if (!parsed.success) {
      g.errors.push(`${fileName}: ${formatZodError(parsed.error)}`);
      continue;
    }
    const pack = parsed.data;
    if (g.seen.has(pack.id)) {
      g.errors.push(`${fileName}: duplicate pack id "${pack.id}" — skipped`);
      continue;
    }
    g.seen.add(pack.id);
    g.packs.push(pack);
    g.loaded.push({
      id: pack.id,
      name: pack.name,
      fileName,
      topicCount: pack.topics.length,
      questionCount: pack.questions.length,
    });
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, g]) => {
      const bank = deriveBank(g.packs, g.loaded);
      return { label, bank: { ...bank, errors: [...g.errors, ...bank.errors] } };
    });
}

/** Alternate content banks for the dev-mode switcher (empty in normal use). */
export const contentVersions: ContentVersion[] = loadVersions();

/** All selectable banks: Live first, then the alternate versions. */
export const allBanks: ContentVersion[] = [
  { label: "Live", bank: liveBank },
  ...contentVersions,
];
