/**
 * Normalizes transcripts and rubric signals so substring matching is
 * insensitive to case, punctuation and hyphenation differences
 * ("Cache-Aside" matches "cache aside").
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedIncludes(haystack: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return false;
  return ` ${normalize(haystack)} `.includes(` ${n} `);
}
