import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentPackSchema, formatZodError, type ContentPack } from "./schema";
import { seedTopics } from "@/core/seed/topics";

/**
 * Gate for AI-generated content: `npm run content:check` (or the full test
 * run) validates every JSON file in content/packs/ against the pack schema
 * and checks cross-references, so a broken pack is caught before it silently
 * disappears from the app.
 */

const PACKS_DIR = path.join(process.cwd(), "content", "packs");

function loadPackFiles(): { file: string; raw: string }[] {
  if (!existsSync(PACKS_DIR)) return [];
  return readdirSync(PACKS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({
      file,
      raw: readFileSync(path.join(PACKS_DIR, file), "utf-8"),
    }));
}

const packFiles = loadPackFiles();

describe("content packs", () => {
  it("content/packs directory exists", () => {
    expect(existsSync(PACKS_DIR)).toBe(true);
  });

  const parsedPacks: { file: string; pack: ContentPack }[] = [];

  it.each(packFiles.map((p) => [p.file, p] as const))(
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
      parsedPacks.push({ file, pack: result.data });
    },
  );

  it("every topic has study notes in the standard structure", () => {
    for (const { file, pack } of parsedPacks) {
      for (const topic of pack.topics) {
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
          const glued = lines.find(
            (l) => l.trim().startsWith("## ") && lines.length > 1,
          );
          expect(
            glued,
            `${file}: topic "${topic.id}" heading ${JSON.stringify(
              glued?.trim(),
            )} must be separated by a blank line (it currently renders as plain text)`,
          ).toBeUndefined();
        }
      }
    }
  });

  it("ids are unique across the topic taxonomy and all packs", () => {
    const topicIds = new Set(seedTopics.map((t) => t.id));
    const questionIds = new Set<string>();
    const packIds = new Set<string>();

    for (const { file, pack } of parsedPacks) {
      expect(packIds.has(pack.id), `${file}: duplicate pack id "${pack.id}"`).toBe(false);
      packIds.add(pack.id);
      for (const t of pack.topics) {
        expect(topicIds.has(t.id), `${file}: topic id "${t.id}" already exists`).toBe(false);
        topicIds.add(t.id);
      }
      for (const q of pack.questions) {
        expect(questionIds.has(q.id), `${file}: question id "${q.id}" already exists`).toBe(false);
        questionIds.add(q.id);
      }
    }
  });

  it("question topicIds and follow-up triggers reference existing things", () => {
    const knownTopicIds = new Set(seedTopics.map((t) => t.id));
    for (const { pack } of parsedPacks) {
      for (const t of pack.topics) knownTopicIds.add(t.id);
    }

    for (const { file, pack } of parsedPacks) {
      for (const q of pack.questions) {
        for (const topicId of q.topicIds) {
          expect(
            knownTopicIds.has(topicId),
            `${file}: question "${q.id}" references unknown topic "${topicId}" — add it to the pack's topics or use a seed topic id`,
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
});
