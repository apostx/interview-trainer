import { fixDomainTerms } from "./audioUtils";

/**
 * Cloud transcription with a bring-your-own API key (never leaves the
 * browser except toward the chosen provider). Whisper large-v3 class
 * accuracy, and — crucially — a per-request vocabulary prompt: the current
 * question's rubric signals are passed in, so the STT knows exactly which
 * technical terms to expect. Without that, keyword scoring punishes the
 * transcriber's gaps instead of the candidate's knowledge.
 */

export type CloudProvider = "groq" | "openai";

const PROVIDERS: Record<CloudProvider, { url: string; model: string }> = {
  groq: {
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    model: "whisper-large-v3-turbo",
  },
  openai: {
    url: "https://api.openai.com/v1/audio/transcriptions",
    model: "whisper-1",
  },
};

/** Always-on technical glossary; per-question terms are appended. */
const BASE_GLOSSARY = [
  "webhook",
  "WebSocket",
  "idempotency",
  "idempotent",
  "Kubernetes",
  "GraphQL",
  "gRPC",
  "CQRS",
  "dead letter queue",
  "NoSQL",
  "Redis",
  "Kafka",
  "microservices",
  "backpressure",
  "circuit breaker",
  "OAuth",
  "JWT",
  "sharding",
  "observability",
  "cache",
];

/** Whisper prompts are token-limited (~224); keep the hint compact. */
export function buildVocabularyPrompt(extraTerms: string[] = []): string {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of [...extraTerms, ...BASE_GLOSSARY]) {
    const term = raw.trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  let prompt = "Technical software interview answer. Vocabulary: ";
  for (const term of terms) {
    if (prompt.length + term.length + 2 > 700) break;
    prompt += `${term}, `;
  }
  return prompt.replace(/, $/, ".");
}

export async function cloudTranscribe(
  blob: Blob,
  options: {
    provider: CloudProvider;
    apiKey: string;
    vocabulary?: string[];
  },
): Promise<string> {
  const { url, model } = PROVIDERS[options.provider];
  const form = new FormData();
  form.append("file", blob, "answer.webm");
  form.append("model", model);
  form.append("language", "en");
  form.append("prompt", buildVocabularyPrompt(options.vocabulary));

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${response.status} ${detail.slice(0, 120)}`);
  }
  const json = (await response.json()) as { text?: string };
  return fixDomainTerms((json.text ?? "").trim());
}
