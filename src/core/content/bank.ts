import type { QuestionCard, Topic } from "@/core/models";
import { contentPackSchema, formatZodError, looksLikePack } from "./schema";
import type { ContentPack } from "./schema";
import { type Bank, type ContentSource, deriveBank } from "./deriveBank";

/**
 * Data packs: every first-level folder under `content/packs/` is an
 * INDEPENDENT bank (a pack may span several JSON files; ids only need to be
 * unique within the pack — different packs may reuse ids freely). A root
 * level `.json` file is treated as a single-file pack named after the file.
 *
 * The app works from the user's pack selection (`bankFor`); the union of
 * every pack backs the DB topic seeding, session card resolution, and the
 * default PDF scope. Cross-pack id overlaps are intentionally not handled:
 * in the union the first pack wins, selections merge naively.
 */

export type { Bank, ContentSource };

export type LoadedPack = {
  id: string;
  name: string;
  fileName: string;
  topicCount: number;
  questionCount: number;
};

export type DataPack = {
  label: string;
  bank: Bank;
  loadedPacks: LoadedPack[];
};

type Group = {
  packs: ContentPack[];
  loaded: LoadedPack[];
  seen: Set<string>;
  errors: string[];
};

function loadGroups(): Map<string, Group> {
  let context: RequireContext;
  try {
    context = require.context("../../../content/packs", true, /\.json$/);
  } catch {
    return new Map();
  }
  const groups = new Map<string, Group>();
  for (const key of context.keys().sort()) {
    // "./label/file.json" → folder pack; "./file.json" → single-file pack.
    const m = key.match(/^\.\/(?:([^/]+)\/)?([^/]+\.json)$/);
    if (!m) continue;
    const label = m[1] ?? m[2].replace(/\.json$/, "");
    const fileName = m[1] ? `${m[1]}/${m[2]}` : m[2];
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
  return groups;
}

const groups = loadGroups();

/** Every data pack, each derived as its own self-contained bank. */
export const dataPacks: DataPack[] = [...groups.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([label, g]) => {
    const derived = deriveBank(g.packs, g.loaded);
    return {
      label,
      bank: { ...derived, errors: [...g.errors, ...derived.errors] },
      loadedPacks: g.loaded,
    };
  });

/** Loader problems per pack, shown on the Topics page. */
export const packErrors: string[] = dataPacks.flatMap((p) =>
  p.bank.errors.map((e) => `${p.label}: ${e}`),
);

export const loadedPacks: LoadedPack[] = dataPacks.flatMap((p) => p.loadedPacks);

// The union of every pack: DB seeding, session card lookup, PDF defaults.
// Cross-pack duplicate ids are silently first-wins here (by design).
const unionBank: Bank = deriveBank(
  [...groups.values()].flatMap((g) => g.packs),
  loadedPacks,
);

export const allTopics: Topic[] = unionBank.topics;
export const allQuestions: QuestionCard[] = unionBank.questions;
export const getCard = (id: string): QuestionCard | undefined =>
  unionBank.getCard(id);

const bankCache = new Map<string, Bank>();

/** Bank for the current pack selection; empty selection = every pack. */
export function bankFor(labels: string[]): Bank {
  const selected = dataPacks.filter((p) => labels.includes(p.label));
  if (selected.length === 0) return unionBank;
  const key = selected.map((p) => p.label).join("|");
  let bank = bankCache.get(key);
  if (!bank) {
    bank = deriveBank(
      selected.flatMap((p) => groups.get(p.label)?.packs ?? []),
      selected.flatMap((p) => p.loadedPacks),
    );
    bankCache.set(key, bank);
  }
  return bank;
}
