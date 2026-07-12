import type { ContentPack } from "./schema";
import { contentPackSchema, formatZodError, looksLikePack } from "./schema";

/**
 * Auto-discovers content packs. Every `.json` in `content/packs/` is bundled,
 * validated against the pack schema and parsed here; the live bank is derived
 * from these (see `deriveBank`/`bank`). Alternate versions for the dev-mode
 * comparison switcher live under `content/versions/<label>/` and are parsed
 * with the same `parsePackContext`. Invalid packs are skipped and reported via
 * `errors` (shown on the Topics page) instead of breaking the app.
 */

export type LoadedPack = {
  id: string;
  name: string;
  fileName: string;
  topicCount: number;
  questionCount: number;
};

export type ParsedPacks = {
  packs: ContentPack[];
  loadedPacks: LoadedPack[];
  errors: string[];
};

/** Validate every `.json` in a bundler require.context of content packs. */
export function parsePackContext(context: RequireContext): ParsedPacks {
  const packs: ContentPack[] = [];
  const loadedPacks: LoadedPack[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const key of context.keys().sort()) {
    const fileName = key.replace(/^\.\//, "");
    let raw: unknown;
    try {
      raw = context(key);
    } catch (e) {
      errors.push(`${fileName}: not valid JSON (${String(e)})`);
      continue;
    }
    // Ignore non-pack sidecar files (audits/manifests) that lack an id.
    if (!looksLikePack(raw)) continue;
    const parsed = contentPackSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`${fileName}: ${formatZodError(parsed.error)}`);
      continue;
    }
    const pack = parsed.data;
    if (seen.has(pack.id)) {
      errors.push(`${fileName}: duplicate pack id "${pack.id}" — skipped`);
      continue;
    }
    seen.add(pack.id);
    packs.push(pack);
    loadedPacks.push({
      id: pack.id,
      name: pack.name,
      fileName,
      topicCount: pack.topics.length,
      questionCount: pack.questions.length,
    });
  }
  return { packs, loadedPacks, errors };
}

function loadDefault(): ParsedPacks {
  try {
    // Statically analyzed by the bundler; unavailable in plain Node (tests).
    return parsePackContext(
      require.context("../../../content/packs", false, /\.json$/),
    );
  } catch {
    return { packs: [], loadedPacks: [], errors: [] };
  }
}

const def = loadDefault();
/** The live content packs (from `content/packs/`). */
export const defaultPacks = def.packs;
export const defaultLoadedPacks = def.loadedPacks;
export const defaultPackErrors = def.errors;
