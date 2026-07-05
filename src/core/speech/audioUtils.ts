/** Loudest absolute sample in the buffer (0–1). */
export function peakLevel(pcm: Float32Array): number {
  let max = 0;
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.abs(pcm[i]);
    if (v > max) max = v;
  }
  return max;
}

/** Below this peak a recording is treated as silence, not sent to Whisper. */
export const SILENCE_PEAK_THRESHOLD = 0.01;

/**
 * Scales quiet-but-audible recordings up so Whisper gets a healthy signal.
 * Mutates and returns the buffer; silence is left untouched (boosting it
 * would only amplify noise).
 */
export function normalizePeak(pcm: Float32Array, target = 0.9): Float32Array {
  const peak = peakLevel(pcm);
  if (peak < SILENCE_PEAK_THRESHOLD || peak >= target) return pcm;
  const gain = target / peak;
  for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;
  return pcm;
}

/** Collapses pathological word runs ("you you you you" → "you you"). */
export function collapseRepeatedWords(text: string, maxRun = 2): string {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let run = 0;
  for (const word of words) {
    const prev = out[out.length - 1];
    if (prev !== undefined && prev.toLowerCase() === word.toLowerCase()) {
      run += 1;
      if (run >= maxRun) continue;
    } else {
      run = 0;
    }
    out.push(word);
  }
  return out.join(" ");
}

/** Phrases Whisper emits for silence/non-speech when nothing was said. */
const HALLUCINATION_PHRASES = new Set([
  "you",
  "thank you",
  "thanks",
  "thank you for watching",
  "thanks for watching",
  "bye",
  "uh",
  "um",
  "the",
  "so",
]);

/**
 * Whisper hallucinates fillers like "you you you" or "Thank you." on silence
 * and non-speech audio. A transcript that is only such a phrase, or is made
 * of at most two distinct short words repeated, carries no answer content.
 */
export function isDegenerateTranscript(text: string): boolean {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return true;
  if (HALLUCINATION_PHRASES.has(words.join(" "))) return true;
  const unique = new Set(words);
  return unique.size <= 2 && words.length >= 3;
}

/**
 * Post-processes raw Whisper output: collapses stuck word loops and maps
 * pure hallucination to an empty string so the UI can say "no speech
 * detected" instead of showing garbage.
 */
export function cleanTranscript(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || isDegenerateTranscript(trimmed)) return "";
  return collapseRepeatedWords(trimmed);
}
