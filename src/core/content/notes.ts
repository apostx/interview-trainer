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
