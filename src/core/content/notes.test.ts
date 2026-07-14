import { describe, expect, it } from "vitest";
import { parseKeyTerm, parseStudyNotes, parseStudySections } from "./notes";

describe("parseStudyNotes", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    expect(parseStudyNotes("First line\ncontinues here.\n\nSecond.")).toEqual([
      { type: "p", text: "First line continues here." },
      { type: "p", text: "Second." },
    ]);
  });

  it("parses '## ' blocks as headings", () => {
    expect(parseStudyNotes("## Big-O basics\n\nBody.")).toEqual([
      { type: "h", text: "Big-O basics" },
      { type: "p", text: "Body." },
    ]);
  });

  it("parses '- ' blocks as bullet lists with wrapped items", () => {
    expect(parseStudyNotes("- one\n- two\n  wraps\n- three")).toEqual([
      { type: "ul", items: ["one", "two wraps", "three"] },
    ]);
  });

  it("splits a lead-in line followed by bullets into p + ul", () => {
    expect(parseStudyNotes("Common cases:\n- O(1) lookup\n- O(n) scan")).toEqual([
      { type: "p", text: "Common cases:" },
      { type: "ul", items: ["O(1) lookup", "O(n) scan"] },
    ]);
  });

  it("ignores extra blank lines and surrounding whitespace", () => {
    expect(parseStudyNotes("\n\n  A  \n\n\n\nB\n\n")).toEqual([
      { type: "p", text: "A" },
      { type: "p", text: "B" },
    ]);
  });
});

const EN_NOTES = [
  "## What is it?",
  "A thing.",
  "## What problem does it solve?",
  "A problem.",
  "## How it works",
  "- step one\n- step two",
  "## Common mistakes",
  "- oops",
  "## Key terms",
  "- Backpressure — pushing back on producers.\n- TTL",
].join("\n\n");

const HU_NOTES = [
  "## Mi ez?",
  "Egy dolog.",
  "## Milyen problémát old meg?",
  "Egy problémát.",
  "## Hogyan működik?",
  "- első lépés",
  "## Gyakori hibák",
  "- hoppá",
  "## Kulcsfogalmak",
  "- Backpressure — a termelők visszafogása.",
].join("\n\n");

describe("parseStudySections", () => {
  it("types the canonical English headings", () => {
    const kinds = parseStudySections(EN_NOTES).map((s) => s.kind);
    expect(kinds).toEqual(["definition", "problem", "mechanism", "mistakes", "terms"]);
  });

  it("types the canonical Hungarian headings", () => {
    const kinds = parseStudySections(HU_NOTES).map((s) => s.kind);
    expect(kinds).toEqual(["definition", "problem", "mechanism", "mistakes", "terms"]);
  });

  it("keeps the localized heading text as the title", () => {
    const titles = parseStudySections(HU_NOTES).map((s) => s.title);
    expect(titles[0]).toBe("Mi ez?");
    expect(titles[4]).toBe("Kulcsfogalmak");
  });

  it("groups blocks under their heading", () => {
    const mechanism = parseStudySections(EN_NOTES)[2];
    expect(mechanism.blocks).toEqual([{ type: "ul", items: ["step one", "step two"] }]);
  });

  it("degrades unknown headings and leading prose to neutral sections", () => {
    const sections = parseStudySections("Intro paragraph.\n\n## Something else\n\nBody.");
    expect(sections.map((s) => s.kind)).toEqual(["other", "other"]);
    expect(sections[0].title).toBe("");
    expect(sections[1].title).toBe("Something else");
  });
});

describe("parseKeyTerm", () => {
  it("splits 'term — explanation' items", () => {
    expect(parseKeyTerm("Backpressure — pushing back on producers.")).toEqual({
      term: "Backpressure",
      def: "pushing back on producers.",
    });
  });

  it("accepts an en dash", () => {
    expect(parseKeyTerm("TTL – time to live").def).toBe("time to live");
  });

  it("falls back to a plain entry without a dash", () => {
    expect(parseKeyTerm("Just a term")).toEqual({ term: "Just a term", def: null });
  });
});
