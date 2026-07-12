import { z } from "zod";
import type {
  InterviewRole,
  QuestionCard,
  Topic,
} from "@/core/models";
import { INTERVIEW_MODES, INTERVIEW_ROLES } from "@/core/models";

/**
 * The fixed data structure for content packs: JSON files dropped into
 * `content/packs/` (see docs/content-authoring.md). The schema is the single
 * source of truth — the app loader and `npm run content:check` both use it,
 * so AI-generated packs are validated the same way everywhere.
 */

const roleEnum = z.enum(INTERVIEW_ROLES as [InterviewRole, ...InterviewRole[]]);
const modeEnum = z.enum(INTERVIEW_MODES as [(typeof INTERVIEW_MODES)[number], ...typeof INTERVIEW_MODES]);

const categoryEnum = z.enum([
  "frontend",
  "backend",
  "fullstack",
  "architecture",
  "cloud",
  "security",
  "database",
  "devops",
  "observability",
  "soft_technical",
  "core",
]);

const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9_]+$/, "use lowercase snake_case ids (a-z, 0-9, _)");

const roleWeightSchema = z
  .record(z.string(), z.number().int().min(1).max(5))
  .superRefine((rec, ctx) => {
    for (const key of Object.keys(rec)) {
      if (!INTERVIEW_ROLES.includes(key as InterviewRole)) {
        ctx.addIssue({
          code: "custom",
          message: `unknown role "${key}" in roleWeight`,
        });
      }
    }
  });

export const rubricItemSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  description: z.string().default(""),
  importance: z.enum(["critical", "important", "nice_to_have"]),
  roleWeight: roleWeightSchema.default({}),
  acceptedSignals: z.array(z.string().min(1)).min(1),
  weakSignals: z.array(z.string().min(1)).optional(),
  negativeSignals: z.array(z.string().min(1)).optional(),
  examples: z.array(z.string()).optional(),
});

// Language code: "hu", "de", "pt-BR". English is the base and never a key.
const langCodeSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'use a language code like "hu" or "pt-BR"');

// Study-only translations. Every field is optional and falls back to English.
const topicI18nSchema = z.record(
  langCodeSchema,
  z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    studyNotes: z.string().optional(),
  }),
);

const cardI18nSchema = z.record(
  langCodeSchema,
  z.object({
    title: z.string().min(1).optional(),
    prompt: z.string().min(1).optional(),
    answerStructureHint: z.string().optional(),
    expectedPoints: z
      .record(
        z.string(),
        z.object({
          label: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .optional(),
    followUps: z.record(z.string(), z.string()).optional(),
  }),
);

const followUpTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rubric_covered"), rubricItemId: z.string() }),
  z.object({ type: z.literal("rubric_missing"), rubricItemId: z.string() }),
  z.object({ type: z.literal("topic_mentioned"), topicId: z.string() }),
  z.object({ type: z.literal("always") }),
]);

export const followUpSchema = z.object({
  id: idSchema,
  trigger: followUpTriggerSchema,
  prompt: z.string().min(1),
  expectedPoints: z.array(rubricItemSchema).default([]),
});

export const packQuestionSchema = z.object({
  id: idSchema,
  /** Overrides the pack-level source files for this one question. */
  sources: z.array(z.string().min(1)).optional(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  roles: z.array(roleEnum).min(1),
  modes: z.array(modeEnum).min(1),
  topicIds: z.array(z.string().min(1)).min(1),
  expectedDurationSeconds: z.number().int().positive().default(180),
  thinkingTimeSeconds: z.number().int().nonnegative().default(45),
  answerStructureHint: z.string().optional(),
  expectedPoints: z.array(rubricItemSchema).min(1),
  followUps: z.array(followUpSchema).default([]),
  sampleStrongAnswer: z.string().optional(),
  sampleWeakAnswer: z.string().optional(),
  /** Study-only translations of the displayed card text. */
  i18n: cardI18nSchema.optional(),
});

export const packTopicSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().default(""),
  category: categoryEnum,
  relatedTopicIds: z.array(z.string()).default([]),
  /** Educational prose for the Study view: paragraphs separated by blank
   * lines, "- " lines become bullet lists. */
  studyNotes: z.string().optional(),
  /** Study-only translations of name/description/studyNotes. */
  i18n: topicI18nSchema.optional(),
});

export const contentPackSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  /** Origin files in dataresource/, e.g. "tibi/lufthansa" (no extension). */
  sources: z.array(z.string().min(1)).default([]),
  topics: z.array(packTopicSchema).default([]),
  questions: z.array(packQuestionSchema).default([]),
});

export type ContentPack = z.infer<typeof contentPackSchema>;
export type PackTopic = z.infer<typeof packTopicSchema>;
export type PackQuestion = z.infer<typeof packQuestionSchema>;

/** Pack topics start as regular known topics; user state lives in the DB. */
export function toTopic(t: PackTopic): Topic {
  return {
    ...t,
    status: "can_explain",
    userConfidence: 3,
  };
}

export function toQuestionCard(q: PackQuestion): QuestionCard {
  // The sources field is loader metadata, not part of the engine card.
  const card = { ...q };
  delete card.sources;
  return card as QuestionCard;
}

/**
 * Whether a parsed JSON value is meant to be a content pack (has a string
 * `id`). Non-pack sidecar files an AI may drop into a content folder — audit
 * summaries, manifests, notes — lack an `id` and are ignored, not validated.
 */
export function looksLikePack(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    !Array.isArray(raw) &&
    typeof (raw as { id?: unknown }).id === "string"
  );
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}
