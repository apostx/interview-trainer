import type { RubricItem, RubricStatus } from "@/core/models";
import { normalizedIncludes } from "./transcriptNormalizer";

/**
 * Semantic rubric matching (spec §11.2): a small local embedding model
 * scores how close what the candidate *said* is to what a rubric item
 * *means*, so paraphrases count without accepting nonsense.
 *
 * Thresholds were calibrated against the seed rubric with paraphrase and
 * garbage answers (see git history): clear paraphrases score ≥ 0.6+,
 * related-but-different concepts (authorization vs authentication) ~0.33,
 * garbage ≤ 0.27. The gap between 0.4 and 0.6 becomes "weak" — half credit,
 * visibly marked, one tap to override.
 */
export const SEMANTIC_COVERED_THRESHOLD = 0.6;
export const SEMANTIC_WEAK_THRESHOLD = 0.4;

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

/** Splits a spoken transcript into clause-sized segments for comparison. */
export function segmentTranscript(transcript: string): string[] {
  const sentences = transcript
    .split(/[.!?;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2);

  const segments: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length <= 24) {
      segments.push(sentence);
    } else {
      // Long rambling clause: overlapping windows keep phrases intact.
      for (let start = 0; start < words.length; start += 16) {
        segments.push(words.slice(start, start + 24).join(" "));
      }
    }
  }
  return segments;
}

/** Texts a rubric item is compared against: full concept + each signal. */
export function itemCandidates(item: RubricItem): string[] {
  return [`${item.label}. ${item.description}`.trim(), ...item.acceptedSignals];
}

function cosine(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // vectors are normalized by the model
}

/**
 * Scores every rubric item against the transcript in one embedding batch.
 * Returns each item's best similarity.
 */
export async function semanticSimilarities(
  transcript: string,
  items: RubricItem[],
  embed: EmbedFn,
): Promise<Map<string, number>> {
  const segments = segmentTranscript(transcript);
  const scores = new Map<string, number>(items.map((i) => [i.id, 0]));
  if (segments.length === 0 || items.length === 0) return scores;

  const candidateRanges: { itemId: string; start: number; end: number }[] = [];
  const candidateTexts: string[] = [];
  for (const item of items) {
    const cands = itemCandidates(item);
    candidateRanges.push({
      itemId: item.id,
      start: candidateTexts.length,
      end: candidateTexts.length + cands.length,
    });
    candidateTexts.push(...cands);
  }

  const vectors = await embed([...segments, ...candidateTexts]);
  const segmentVectors = vectors.slice(0, segments.length);
  const candidateVectors = vectors.slice(segments.length);

  for (const range of candidateRanges) {
    let best = 0;
    for (const segVec of segmentVectors) {
      for (let c = range.start; c < range.end; c++) {
        const s = cosine(segVec, candidateVectors[c]);
        if (s > best) best = s;
      }
    }
    scores.set(range.itemId, best);
  }
  return scores;
}

export function statusFromSimilarity(similarity: number): RubricStatus {
  if (similarity >= SEMANTIC_COVERED_THRESHOLD) return "covered";
  if (similarity >= SEMANTIC_WEAK_THRESHOLD) return "weak";
  return "missing";
}

const STATUS_RANK: Record<RubricStatus, number> = {
  missing: 0,
  weak: 1,
  covered: 2,
};

/**
 * Combines keyword and semantic verdicts: the stronger one wins, but an
 * explicit negative signal ("just retry until it works") still caps the
 * item at weak — saying the wrong thing shouldn't earn full credit.
 */
export function combineStatuses(
  keyword: RubricStatus,
  semantic: RubricStatus,
  negativeSignalMatched: boolean,
): RubricStatus {
  const stronger =
    STATUS_RANK[semantic] > STATUS_RANK[keyword] ? semantic : keyword;
  if (negativeSignalMatched && stronger === "covered") return "weak";
  return stronger;
}

export function hasNegativeSignal(
  transcript: string,
  item: RubricItem,
): boolean {
  return (
    item.negativeSignals?.some((signal) =>
      normalizedIncludes(transcript, signal),
    ) ?? false
  );
}
