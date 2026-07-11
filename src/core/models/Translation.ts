/**
 * Optional translations of the text shown in the Study view. Everything is
 * per-field and optional: any field a translation omits falls back to the
 * English original. English is always the base and never appears here.
 * The interview/practice flow ignores translations and always uses English.
 */

/** BCP-47-ish language code: "hu", "de", "pt-BR". */
export type LangCode = string;

export type TopicTranslation = {
  name?: string;
  description?: string;
  studyNotes?: string;
};

export type CardTranslation = {
  title?: string;
  prompt?: string;
  answerStructureHint?: string;
  /** Keyed by the rubric item's id. */
  expectedPoints?: Record<string, { label?: string; description?: string }>;
  /** Keyed by the follow-up's id → translated prompt. */
  followUps?: Record<string, string>;
};

export type TopicI18n = Record<LangCode, TopicTranslation>;
export type CardI18n = Record<LangCode, CardTranslation>;
