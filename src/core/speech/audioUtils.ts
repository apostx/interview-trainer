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

/**
 * Domain-term post-correction for speech engines that miss technical
 * vocabulary (Web Speech has no custom dictionary). Conservative,
 * word-boundary, case-insensitive replacements.
 */
const DOMAIN_TERM_FIXES: [RegExp, string][] = [
  [/\bweb hooks\b/gi, "webhooks"],
  [/\bweb hook\b/gi, "webhook"],
  [/\bthat book\b/gi, "webhook"],
  [/\bweb sockets\b/gi, "websockets"],
  [/\bweb socket\b/gi, "websocket"],
  [/\bmicro services\b/gi, "microservices"],
  [/\bmicro service\b/gi, "microservice"],
  [/\bmicro frontends\b/gi, "microfrontends"],
  [/\bmicro frontend\b/gi, "microfrontend"],
  [/\bjava script\b/gi, "JavaScript"],
  [/\btype script\b/gi, "TypeScript"],
  [/\bno sequel\b/gi, "NoSQL"],
  [/\bsequel\b/gi, "SQL"],
  [/\bgraph ql\b/gi, "GraphQL"],
  [/\bidem potency\b/gi, "idempotency"],
  [/\bidem potent\b/gi, "idempotent"],
  [/\bdead letter q\b/gi, "dead letter queue"],
  [/\bmessage q\b/gi, "message queue"],
  [/\bcashing\b/gi, "caching"],
  [/\bcash\b/gi, "cache"],
  [/\bkuber netes\b/gi, "Kubernetes"],
  [/\bcuba are nets\b/gi, "Kubernetes"],
  [/\bcuba or nets\b/gi, "Kubernetes"],
];

export function fixDomainTerms(text: string): string {
  let result = text;
  for (const [pattern, replacement] of DOMAIN_TERM_FIXES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Phones and low-memory devices crash loading the base/small Whisper models
 * (the tab is OOM-killed during or right after transcription), so the local
 * model is capped to tiny there.
 */
export function isConstrainedDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return mobile || (memory !== undefined && memory <= 4);
}

export function effectiveLocalModel<T extends string>(model: T): T | "tiny" {
  return isConstrainedDevice() ? "tiny" : model;
}
