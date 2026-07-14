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

/** Whether a topic has educational material for the Study view — in either
 * the structured (`studyContent`) or the legacy (`studyNotes`) format. */
export function hasStudyMaterial(t: {
  studyNotes?: string;
  studyContent?: unknown;
}): boolean {
  return Boolean(t.studyContent ?? t.studyNotes);
}

/** "Key terms" / "Kulcsfogalmak" heading (its list renders as term cards). */
export function isTermsHeading(text: string): boolean {
  return /^(key terms|kulcsfogalmak)/i.test(text);
}

/** "What is it?" / "Mi ez?" heading. */
export function isDefinitionHeading(text: string): boolean {
  return /^(what is it|mi ez)\b/i.test(text);
}

/** "What problem does it solve?" / "Milyen problémát old meg?" heading. */
export function isProblemHeading(text: string): boolean {
  return /^(what problem|milyen probl)/i.test(text);
}

/**
 * First paragraph of the section whose heading matches — the flashcard
 * export prefers this teaching prose over the telegram-style description.
 */
export function sectionLead(
  notes: string | undefined,
  matches: (heading: string) => boolean,
): string | null {
  if (!notes) return null;
  let inSection = false;
  for (const block of parseStudyNotes(notes)) {
    if (block.type === "h") inSection = matches(block.text);
    else if (inSection) return block.type === "p" ? block.text : null;
  }
  return null;
}

/** "Common mistakes" / "Gyakori hibák" heading (gets the warning marker —
 * the one visually isolated element, which is what makes it memorable). */
export function isMistakesHeading(text: string): boolean {
  return /^(common mistakes|gyakori hib)/i.test(text);
}

/**
 * Splits a key-terms list item written as "term — explanation" (em/en dash)
 * into a term card; items without a dash fall back to a plain entry.
 * Items never contain newlines (parseStudyNotes joins continuation lines).
 */
export function parseKeyTerm(item: string): { term: string; def: string | null } {
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
