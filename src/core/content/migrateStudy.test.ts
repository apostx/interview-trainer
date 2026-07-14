import { describe, expect, it } from "vitest";
// The migration script exports its pure logic for testing.
import { migratePackObject, notesToStudyContent as notesToStudyContentJs } from "../../../scripts/migrate-study.mjs";
import { studyContentSchema } from "./schema";

// The script is plain JS; type its result here so the assertions type-check.
type MigrationResult =
  | { ok: true; content: import("@/core/models").StudyContent }
  | { ok: false; reason: string };
const notesToStudyContent = notesToStudyContentJs as (notes: string) => MigrationResult;

function expectOk(r: MigrationResult): import("@/core/models").StudyContent {
  expect(r.ok, r.ok ? "" : (r as { reason: string }).reason).toBe(true);
  if (!r.ok) throw new Error(r.reason);
  return r.content;
}

const GOOD_NOTES = [
  "## What is it?",
  "Backpressure means a busy part of the system tells the sender to slow down.",
  "## What problem does it solve?",
  "Without it, waiting work keeps growing and the service may fail.",
  "## How it works",
  "- The consumer signals capacity.\n- The producer slows down or is rejected.",
  "## Common mistakes",
  "- Calling any rate limit backpressure.\n- Using an unbounded queue.",
  "## Key terms",
  "- bounded queue — a queue with a maximum capacity",
].join("\n\n");

const GOOD_NOTES_HU = GOOD_NOTES.replace("## What is it?", "## Mi ez?")
  .replace("## What problem does it solve?", "## Milyen problémát old meg?")
  .replace("## How it works", "## Hogyan működik?")
  .replace("## Common mistakes", "## Gyakori hibák")
  .replace("## Key terms", "## Kulcsfogalmak");

describe("notesToStudyContent", () => {
  it("migrates well-structured legacy notes into schema-valid content", () => {
    const content = expectOk(notesToStudyContent(GOOD_NOTES));
    expect(content.mentalModel).toContain("slow down");
    expect(content.howItWorks).toHaveLength(2);
    expect(content.keyTerms[0]).toEqual({
      term: "bounded queue",
      definition: "a queue with a maximum capacity",
    });
    expect(content.example).toBeUndefined();
    expect(studyContentSchema.safeParse(content).success).toBe(true);
  });

  it("migrates Hungarian headings too", () => {
    expect(notesToStudyContent(GOOD_NOTES_HU).ok).toBe(true);
  });

  it("fails safely on a multi-paragraph 'What is it?'", () => {
    const r = notesToStudyContent(GOOD_NOTES.replace(
      "Backpressure means a busy part of the system tells the sender to slow down.",
      "First paragraph.\n\nSecond paragraph.",
    ));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.reason).toContain("single paragraph");
  });

  it("fails safely on too many how-it-works steps", () => {
    const r = notesToStudyContent(GOOD_NOTES.replace(
      "- The consumer signals capacity.\n- The producer slows down or is rejected.",
      Array.from({ length: 6 }, (_, i) => `- step ${i + 1}`).join("\n"),
    ));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.reason).toContain("6 steps");
  });

  it("fails safely on malformed notes (glued heading)", () => {
    const r = notesToStudyContent("## What is it?\nGlued to the heading.");
    expect(r.ok).toBe(false);
  });

  it("fails safely on a key term without a dash", () => {
    const r = notesToStudyContent(GOOD_NOTES.replace(
      "- bounded queue — a queue with a maximum capacity",
      "- bounded queue only",
    ));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.reason).toContain("key term");
  });
});

describe("migratePackObject", () => {
  // Plain JSON-shaped fixtures; typed loosely like the script consumes them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pack = (): any => ({
    id: "p",
    topics: [
      { id: "good", studyNotes: GOOD_NOTES, i18n: { hu: { studyNotes: GOOD_NOTES_HU } } },
      { id: "already", studyNotes: GOOD_NOTES, studyContent: { existing: true } },
      { id: "broken", studyNotes: "no structure at all" },
    ],
  });

  it("migrates topics with translations, skips existing, reports failures", () => {
    const p = pack();
    const report = migratePackObject(p);
    expect(report).toEqual([
      { id: "good", status: "migrated" },
      { id: "already", status: "skipped", reason: "already has studyContent" },
      { id: "broken", status: "failed", reason: expect.any(String) },
    ]);
    // migrated: structured content added, legacy strings preserved
    expect(p.topics[0].studyContent.mentalModel).toContain("slow down");
    expect(p.topics[0].studyNotes).toBe(GOOD_NOTES);
    expect(p.topics[0].i18n.hu.studyContent.mentalModel).toContain("slow down");
    expect(p.topics[0].i18n.hu.studyNotes).toBe(GOOD_NOTES_HU);
    // failed: left completely untouched
    expect(p.topics[2].studyContent).toBeUndefined();
    expect(p.topics[2].studyNotes).toBe("no structure at all");
  });

  it("fails the whole topic when a translation cannot migrate", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = {
      id: "p",
      topics: [
        {
          id: "t",
          studyNotes: GOOD_NOTES,
          i18n: { hu: { studyNotes: "## Mi ez?\nGlued." } },
        },
      ],
    };
    const report = migratePackObject(p);
    expect(report[0].status).toBe("failed");
    expect(report[0].reason).toContain("i18n.hu");
    expect(p.topics[0].studyContent).toBeUndefined();
  });
});
