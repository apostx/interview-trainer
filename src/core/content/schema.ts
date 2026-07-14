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

// Structured study content: deterministic simplicity limits. Headings are
// rendered by the app, so "## " markers are banned inside the fields.
const plainProse = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => !s.includes("## "), {
      message: "no '## ' markdown headings inside structured fields",
    });

const studyKeyTermSchema = z.object({
  term: plainProse(60),
  definition: plainProse(220),
});

export const studyContentSchema = z.object({
  mentalModel: plainProse(300).refine((s) => !s.includes("\n\n"), {
    message: "mentalModel must be a single paragraph",
  }),
  problem: plainProse(600),
  // Required for new content (the authoring prompt enforces it); optional in
  // the schema so mechanically migrated legacy notes stay valid.
  example: plainProse(700).optional(),
  howItWorks: z.array(plainProse(220)).min(2).max(5),
  commonMistakes: z.array(plainProse(220)).min(2).max(4),
  keyTerms: z.array(studyKeyTermSchema).min(1).max(5),
});

// Translations get ~30% length slack (Hungarian runs longer than English).
// Scalars fall back per field; a provided array replaces the English array.
const studyContentI18nSchema = z.object({
  mentalModel: plainProse(400).optional(),
  problem: plainProse(800).optional(),
  example: plainProse(900).optional(),
  howItWorks: z.array(plainProse(280)).min(2).max(5).optional(),
  commonMistakes: z.array(plainProse(280)).min(2).max(4).optional(),
  keyTerms: z
    .array(z.object({ term: plainProse(80), definition: plainProse(280) }))
    .min(1)
    .max(5)
    .optional(),
});

// Study-only translations. Every field is optional and falls back to English.
const topicI18nSchema = z.record(
  langCodeSchema,
  z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    studyNotes: z.string().optional(),
    studyContent: studyContentI18nSchema.optional(),
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
  /** Legacy educational prose: paragraphs separated by blank lines, "- "
   * lines become bullet lists. Superseded by `studyContent`. */
  studyNotes: z.string().optional(),
  /** Structured educational content (preferred; see docs/content-authoring.md). */
  studyContent: studyContentSchema.optional(),
  /** Interview essentiality, 5 = asked almost always … 1 = niche. Optional
   * for backward compatibility; drives the Study importance filter. */
  importance: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
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
