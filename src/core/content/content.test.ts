import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  contentPackSchema,
  formatZodError,
  looksLikePack,
  type ContentPack,
} from "./schema";
import { seedTopics } from "@/core/seed/topics";

/**
 * Gate for AI-generated content: `npm run content:check` (or the full test
 * run) validates every data pack. Every first-level FOLDER under
 * content/packs/ is an INDEPENDENT pack (it may span several JSON files);
 * a root-level .json is a single-file pack. Ids only need to be unique
 * within one pack — different packs may reuse ids freely, and questions may
 * only reference topics of their own pack (or seed taxonomy ids).
 */

const PACKS_DIR = path.join(process.cwd(), "content", "packs");

/** True unless the file is a non-pack sidecar (audit/manifest without an id). */
function isPackFile(raw: string): boolean {
  try {
    return looksLikePack(JSON.parse(raw));
  } catch {
    return true; // malformed JSON is a real error the schema step will report
  }
}

type PackFile = { file: string; raw: string };

function loadPackGroups(): Map<string, PackFile[]> {
  const groups = new Map<string, PackFile[]>();
  if (!existsSync(PACKS_DIR)) return groups;
  for (const entry of readdirSync(PACKS_DIR)) {
    const full = path.join(PACKS_DIR, entry);
    if (statSync(full).isDirectory()) {
      const files = readdirSync(full)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ({
          file: `${entry}/${f}`,
          raw: readFileSync(path.join(full, f), "utf-8"),
        }))
        .filter((f) => isPackFile(f.raw));
      if (files.length > 0) groups.set(entry, files);
    } else if (entry.endsWith(".json")) {
      const raw = readFileSync(full, "utf-8");
      if (isPackFile(raw)) groups.set(entry.replace(/\.json$/, ""), [{ file: entry, raw }]);
    }
  }
  return groups;
}

/** `example` is mandatory for newly authored studyContent but schema-optional
 * (mechanically migrated legacy content has none); aggregated per pack so a
 * freshly migrated bank does not print dozens of lines. */
function warnMissingExamples(file: string, pack: ContentPack) {
  const missing = pack.topics
    .filter((t) => t.studyContent && !t.studyContent.example)
    .map((t) => t.id);
  if (missing.length > 0) {
    console.warn(
      `${file}: ${missing.length} topic(s) with studyContent but no example — allowed for mechanically migrated legacy content, but new content should include one: ${missing.join(", ")}`,
    );
  }
}

/** Every topic needs study material: structured `studyContent` (preferred —
 * field limits enforced by the schema) or legacy `studyNotes` in the fixed
 * heading structure. */
function assertStudyNotesStructure(file: string, topic: ContentPack["topics"][number]) {
  if (topic.studyContent) {
    const sc = topic.studyContent;
    const words = [
      sc.mentalModel,
      sc.problem,
      sc.example ?? "",
      ...sc.howItWorks,
      ...sc.commonMistakes,
      ...sc.keyTerms.map((k) => `${k.term} ${k.definition}`),
    ]
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    if (words > 260) {
      console.warn(
        `${file}: topic "${topic.id}" studyContent is ${words} words — prefer 100–260 (simplicity over completeness)`,
      );
    }
    return;
  }
  const notes = topic.studyNotes ?? "";
  expect(
    notes.startsWith("## What is it?"),
    `${file}: topic "${topic.id}" studyNotes must start with "## What is it?" (see docs/content-authoring.md)`,
  ).toBe(true);
  expect(
    notes.includes("## Common mistakes"),
    `${file}: topic "${topic.id}" studyNotes must contain a "## Common mistakes" section`,
  ).toBe(true);
  expect(
    notes.includes("## Key terms"),
    `${file}: topic "${topic.id}" studyNotes must contain a "## Key terms" section`,
  ).toBe(true);
  // A "## " header must stand alone (its own blank-line-separated block),
  // otherwise it renders as literal text instead of a heading.
  for (const block of notes.split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const glued = lines.find((l) => l.trim().startsWith("## ") && lines.length > 1);
    expect(
      glued,
      `${file}: topic "${topic.id}" heading ${JSON.stringify(glued?.trim())} must be separated by a blank line (it currently renders as plain text)`,
    ).toBeUndefined();
  }
}

const packGroups = loadPackGroups();

describe("data packs", () => {
  it("content/packs directory exists", () => {
    expect(existsSync(PACKS_DIR)).toBe(true);
  });

  describe.each([...packGroups.entries()].map(([label, files]) => [label, files] as const))(
    "pack %s",
    (label, files) => {
      const parsed: { file: string; pack: ContentPack }[] = [];

      it.each(files.map((f) => [f.file, f] as const))(
        "%s is valid JSON and matches the pack schema",
        (_name, { file, raw }) => {
          let json: unknown;
          expect(() => {
            json = JSON.parse(raw);
          }, `${file} is not valid JSON`).not.toThrow();

          const result = contentPackSchema.safeParse(json);
          if (!result.success) {
            expect.fail(`${file}: ${formatZodError(result.error)}`);
          }
          parsed.push({ file, pack: result.data });
        },
      );

      it("every topic has study material in the standard structure", () => {
        for (const { file, pack } of parsed) {
          for (const topic of pack.topics) {
            assertStudyNotesStructure(file, topic);
          }
          warnMissingExamples(file, pack);
        }
      });

      it("ids are unique within the pack", () => {
        // Seed taxonomy ids MAY be redefined by a pack (the pack's version
        // wins), so uniqueness is only checked against the pack itself.
        const topicIds = new Set<string>();
        const questionIds = new Set<string>();
        const packIds = new Set<string>();
        for (const { file, pack } of parsed) {
          expect(packIds.has(pack.id), `${file}: duplicate pack id "${pack.id}" within ${label}`).toBe(false);
          packIds.add(pack.id);
          for (const t of pack.topics) {
            expect(
              topicIds.has(t.id),
              `${file}: topic id "${t.id}" already exists in pack "${label}"`,
            ).toBe(false);
            topicIds.add(t.id);
          }
          for (const q of pack.questions) {
            expect(
              questionIds.has(q.id),
              `${file}: question id "${q.id}" already exists in pack "${label}"`,
            ).toBe(false);
            questionIds.add(q.id);
          }
        }
      });

      it("question topicIds and follow-up triggers reference this pack (or seeds)", () => {
        const knownTopicIds = new Set(seedTopics.map((t) => t.id));
        for (const { pack } of parsed) {
          for (const t of pack.topics) knownTopicIds.add(t.id);
        }
        for (const { file, pack } of parsed) {
          for (const q of pack.questions) {
            for (const topicId of q.topicIds) {
              expect(
                knownTopicIds.has(topicId),
                `${file}: question "${q.id}" references unknown topic "${topicId}" — packs are independent, so the topic must be defined in this pack (or be a seed topic id)`,
              ).toBe(true);
            }
            const rubricIds = new Set(q.expectedPoints.map((p) => p.id));
            for (const f of q.followUps) {
              if (
                f.trigger.type === "rubric_covered" ||
                f.trigger.type === "rubric_missing"
              ) {
                expect(
                  rubricIds.has(f.trigger.rubricItemId),
                  `${file}: follow-up "${f.id}" trigger references unknown rubric item "${f.trigger.rubricItemId}"`,
                ).toBe(true);
              }
            }
          }
        }
      });
    },
  );
});
