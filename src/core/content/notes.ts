/**
 * Study notes are lightweight text: paragraphs separated by blank lines;
 * a block whose lines all start with "- " renders as a bullet list; a line
 * ending with ":" directly before a list acts as its lead-in. Parsed once
 * here so the Study view and the PDF render identically.
 */

export type NoteBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] };

/** Information type of a studyNotes section, for semantic styling. */
export type StudySectionKind =
  | "definition"
  | "problem"
  | "mechanism"
  | "mistakes"
  | "terms"
  | "other";

export type StudySection = {
  kind: StudySectionKind;
  /** The heading as written in the content (already localized). */
  title: string;
  blocks: NoteBlock[];
};

// Recognizes the canonical headings in English and Hungarian; anything else
// degrades to a neutral "other" section.
const SECTION_KIND_PATTERNS: [RegExp, StudySectionKind][] = [
  [/^(what is it|mi ez)\b/i, "definition"],
  [/^(what problem|milyen probl)/i, "problem"],
  [/^(how it works|hogyan műk)/i, "mechanism"],
  [/^(common mistakes|gyakori hib)/i, "mistakes"],
  [/^(key terms|kulcsfogalmak)/i, "terms"],
];

function sectionKind(heading: string): StudySectionKind {
  for (const [pattern, kind] of SECTION_KIND_PATTERNS) {
    if (pattern.test(heading)) return kind;
  }
  return "other";
}

/** Groups the note blocks under their "## " headings into typed sections. */
export function parseStudySections(notes: string): StudySection[] {
  const sections: StudySection[] = [];
  let current: StudySection | null = null;
  for (const block of parseStudyNotes(notes)) {
    if (block.type === "h") {
      current = { kind: sectionKind(block.text), title: block.text, blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { kind: "other", title: "", blocks: [] };
      sections.push(current);
    }
    current.blocks.push(block);
  }
  return sections;
}

/**
 * Splits a key-terms list item written as "term — explanation" (em/en dash)
 * into a term card; items without a dash fall back to a plain entry.
 */
export function parseKeyTerm(item: string): { term: string; def: string | null } {
  // Items never contain newlines (parseStudyNotes joins continuation lines).
  const m = item.match(/^(.{1,60}?)\s+[—–]\s+(.+)$/);
  return m ? { term: m[1], def: m[2] } : { term: item, def: null };
}

export function parseStudyNotes(notes: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  for (const raw of notes.split(/\n\s*\n/)) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n").map((l) => l.trim());

    // "## Heading" marks a subsection.
    if (lines.length === 1 && lines[0].startsWith("## ")) {
      blocks.push({ type: "h", text: lines[0].slice(3).trim() });
      continue;
    }

    // Mixed block: leading prose lines, then bullets.
    const firstBullet = lines.findIndex((l) => l.startsWith("- "));
    if (firstBullet === -1) {
      blocks.push({ type: "p", text: lines.join(" ") });
      continue;
    }
    if (firstBullet > 0) {
      blocks.push({ type: "p", text: lines.slice(0, firstBullet).join(" ") });
    }
    const items: string[] = [];
    for (const line of lines.slice(firstBullet)) {
      if (line.startsWith("- ")) items.push(line.slice(2).trim());
      else if (items.length > 0) items[items.length - 1] += ` ${line}`;
    }
    blocks.push({ type: "ul", items });
  }
  return blocks;
}
