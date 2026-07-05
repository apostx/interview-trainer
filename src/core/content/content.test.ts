import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentPackSchema, formatZodError, type ContentPack } from "./schema";
import { seedQuestions } from "@/core/seed/questions";
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

  it("ids are unique across seed content and all packs", () => {
    const topicIds = new Set(seedTopics.map((t) => t.id));
    const questionIds = new Set(seedQuestions.map((q) => q.id));
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
