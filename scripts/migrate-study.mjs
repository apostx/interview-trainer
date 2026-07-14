// Mechanical studyNotes → studyContent migration (npm run content:migrate-study).
//
// Moves legacy free-form notes into the structured format WITHOUT rewriting
// prose: a topic migrates only when every section fits the structured limits
// exactly (and every translation migrates too, so a reader never silently
// falls back to English). Anything else is reported and left untouched —
// content is never discarded. studyNotes strings are kept during the
// transition; the app prefers studyContent when both exist.
//
// Usage: node scripts/migrate-study.mjs [--dry-run] [--dir content/packs]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const SECTION_MATCHERS = [
  [/^(what is it|mi ez)\b/i, "definition"],
  [/^(what problem|milyen probl)/i, "problem"],
  [/^(how it works|hogyan műk)/i, "howItWorks"],
  [/^(common mistakes|gyakori hib)/i, "mistakes"],
  [/^(key terms|kulcsfogalmak)/i, "terms"],
];

// Same block model as src/core/content/notes.ts (kept dependency-free so the
// script runs under plain node).
export function parseBlocks(notes) {
  const blocks = [];
  for (const raw of notes.split(/\n\s*\n/)) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.length === 1 && lines[0].startsWith("## ")) {
      blocks.push({ type: "h", text: lines[0].slice(3).trim() });
      continue;
    }
    const firstBullet = lines.findIndex((l) => l.startsWith("- "));
    if (firstBullet === -1) {
      blocks.push({ type: "p", text: lines.join(" ") });
      continue;
    }
    if (firstBullet > 0) {
      blocks.push({ type: "p", text: lines.slice(0, firstBullet).join(" ") });
    }
    const items = [];
    for (const line of lines.slice(firstBullet)) {
      if (line.startsWith("- ")) items.push(line.slice(2).trim());
      else if (items.length > 0) items[items.length - 1] += ` ${line}`;
    }
    blocks.push({ type: "ul", items });
  }
  return blocks;
}

function sectionsOf(notes) {
  const sections = new Map();
  let current = null;
  for (const block of parseBlocks(notes)) {
    if (block.type === "h") {
      const kind = SECTION_MATCHERS.find(([re]) => re.test(block.text))?.[1];
      if (!kind) return { error: `unknown heading "${block.text}"` };
      if (sections.has(kind)) return { error: `duplicate section "${kind}"` };
      current = [];
      sections.set(kind, current);
      continue;
    }
    if (!current) return { error: "prose before the first heading" };
    current.push(block);
  }
  return { sections };
}

const onlyParagraphs = (blocks) => blocks.every((b) => b.type === "p");
const onlyBullets = (blocks) =>
  blocks.length > 0 && blocks.every((b) => b.type === "ul");
const bulletItems = (blocks) => blocks.flatMap((b) => b.items);

/**
 * Converts one legacy studyNotes string into a candidate studyContent.
 * Returns { ok: true, content } or { ok: false, reason } — never a lossy
 * partial result.
 */
export function notesToStudyContent(notes) {
  const { sections, error } = sectionsOf(notes);
  if (error) return { ok: false, reason: error };
  for (const kind of ["definition", "problem", "howItWorks", "mistakes", "terms"]) {
    if (!sections.has(kind)) return { ok: false, reason: `missing "${kind}" section` };
  }

  const definition = sections.get("definition");
  if (!onlyParagraphs(definition) || definition.length !== 1) {
    return { ok: false, reason: "'What is it?' is not a single paragraph — needs a manual rewrite into a short mentalModel" };
  }
  const mentalModel = definition[0].text;
  if (mentalModel.length > 300) {
    return { ok: false, reason: `'What is it?' is ${mentalModel.length} chars (max 300 for mentalModel)` };
  }

  const problemBlocks = sections.get("problem");
  if (!onlyParagraphs(problemBlocks)) {
    return { ok: false, reason: "'What problem…' contains lists — needs a manual rewrite" };
  }
  const problem = problemBlocks.map((b) => b.text).join(" ");
  if (problem.length > 600) {
    return { ok: false, reason: `'What problem…' is ${problem.length} chars (max 600)` };
  }

  const how = sections.get("howItWorks");
  if (!onlyBullets(how)) {
    return { ok: false, reason: "'How it works' has prose outside bullets — needs a manual rewrite" };
  }
  const howItWorks = bulletItems(how);
  if (howItWorks.length < 2 || howItWorks.length > 5) {
    return { ok: false, reason: `'How it works' has ${howItWorks.length} steps (need 2–5)` };
  }
  if (howItWorks.some((i) => i.length > 220)) {
    return { ok: false, reason: "a 'How it works' step exceeds 220 chars" };
  }

  const mistakesBlocks = sections.get("mistakes");
  if (!onlyBullets(mistakesBlocks)) {
    return { ok: false, reason: "'Common mistakes' has prose outside bullets" };
  }
  const commonMistakes = bulletItems(mistakesBlocks);
  if (commonMistakes.length < 2 || commonMistakes.length > 4) {
    return { ok: false, reason: `'Common mistakes' has ${commonMistakes.length} items (need 2–4)` };
  }
  if (commonMistakes.some((i) => i.length > 220)) {
    return { ok: false, reason: "a 'Common mistakes' item exceeds 220 chars" };
  }

  const termsBlocks = sections.get("terms");
  if (!onlyBullets(termsBlocks)) {
    return { ok: false, reason: "'Key terms' has prose outside bullets" };
  }
  const keyTerms = [];
  for (const item of bulletItems(termsBlocks)) {
    const m = item.match(/^(.{1,60}?)\s+[—–]\s+(.+)$/);
    if (!m) return { ok: false, reason: `key term "${item.slice(0, 40)}…" is not "term — definition"` };
    if (m[2].length > 220) return { ok: false, reason: `key term "${m[1]}" definition exceeds 220 chars` };
    keyTerms.push({ term: m[1], definition: m[2] });
  }
  if (keyTerms.length < 1 || keyTerms.length > 5) {
    return { ok: false, reason: `${keyTerms.length} key terms (need 1–5)` };
  }

  // No example section exists in legacy notes; the field stays absent until
  // the content is rewritten/regenerated.
  return { ok: true, content: { mentalModel, problem, howItWorks, commonMistakes, keyTerms } };
}

/** Migrates one parsed pack in place. Returns a per-topic report. */
export function migratePackObject(pack) {
  const report = [];
  for (const topic of pack.topics ?? []) {
    if (topic.studyContent) {
      report.push({ id: topic.id, status: "skipped", reason: "already has studyContent" });
      continue;
    }
    if (!topic.studyNotes) {
      report.push({ id: topic.id, status: "skipped", reason: "no studyNotes" });
      continue;
    }
    const base = notesToStudyContent(topic.studyNotes);
    if (!base.ok) {
      report.push({ id: topic.id, status: "failed", reason: base.reason });
      continue;
    }
    // Every translated studyNotes must migrate too — otherwise the app would
    // prefer studyContent and a translated reader would silently get English.
    const i18nContent = {};
    let i18nFailure = null;
    for (const [lang, tr] of Object.entries(topic.i18n ?? {})) {
      if (!tr.studyNotes) continue;
      const translated = notesToStudyContent(tr.studyNotes);
      if (!translated.ok) {
        i18nFailure = `i18n.${lang}: ${translated.reason}`;
        break;
      }
      i18nContent[lang] = translated.content;
    }
    if (i18nFailure) {
      report.push({ id: topic.id, status: "failed", reason: i18nFailure });
      continue;
    }
    topic.studyContent = base.content;
    for (const [lang, content] of Object.entries(i18nContent)) {
      topic.i18n[lang].studyContent = content;
    }
    report.push({ id: topic.id, status: "migrated" });
  }
  return report;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dirIdx = args.indexOf("--dir");
  const dir = path.join(process.cwd(), dirIdx >= 0 ? args[dirIdx + 1] : "content/packs");
  if (!existsSync(dir)) {
    console.error(`directory not found: ${dir}`);
    process.exit(1);
  }
  let migrated = 0, failed = 0, skipped = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const full = path.join(dir, file);
    let pack;
    try {
      pack = JSON.parse(readFileSync(full, "utf-8"));
    } catch (e) {
      console.error(`❌ ${file}: not valid JSON (${e.message})`);
      failed++;
      continue;
    }
    if (typeof pack.id !== "string") continue; // sidecar file
    const report = migratePackObject(pack);
    const changed = report.some((r) => r.status === "migrated");
    for (const r of report) {
      if (r.status === "migrated") { migrated++; console.log(`✅ ${file} · ${r.id}`); }
      else if (r.status === "failed") { failed++; console.log(`❌ ${file} · ${r.id}: ${r.reason}`); }
      else skipped++;
    }
    if (changed && !dryRun) {
      writeFileSync(full, JSON.stringify(pack, null, 2) + "\n");
    }
  }
  console.log(
    `\n${dryRun ? "[dry-run] " : ""}migrated ${migrated}, failed ${failed}, skipped ${skipped}` +
      (failed > 0 ? " — failed topics keep their studyNotes; rewrite them manually or regenerate (docs/content-authoring.md)" : ""),
  );
  console.log("Run `npm run content:check` afterwards to validate the result.");
}

// Run only when invoked directly (vitest imports the exports above).
if (process.argv[1]?.endsWith("migrate-study.mjs")) {
  main();
}
