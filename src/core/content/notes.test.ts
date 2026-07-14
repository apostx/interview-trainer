import { describe, expect, it } from "vitest";
import {
  isMistakesHeading,
  isTermsHeading,
  parseKeyTerm,
  parseStudyNotes,
} from "./notes";

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

describe("heading kind helpers", () => {
  it("recognizes the terms heading in English and Hungarian", () => {
    expect(isTermsHeading("Key terms")).toBe(true);
    expect(isTermsHeading("Kulcsfogalmak")).toBe(true);
    expect(isTermsHeading("How it works")).toBe(false);
  });

  it("recognizes the mistakes heading in English and Hungarian", () => {
    expect(isMistakesHeading("Common mistakes")).toBe(true);
    expect(isMistakesHeading("Gyakori hibák")).toBe(true);
    expect(isMistakesHeading("Key terms")).toBe(false);
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
