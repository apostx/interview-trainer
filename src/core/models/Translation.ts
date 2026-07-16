/**
 * Optional translations of the text shown in the Study view. Everything is
 * per-field and optional: any field a translation omits falls back to the
 * English original. English is always the base and never appears here.
 * The interview/practice flow ignores translations and always uses English.
 */

/** BCP-47-ish language code: "hu", "de", "pt-BR". */
export type LangCode = string;

/**
 * Translation of structured study content. Scalars fall back to English
 * per field; a provided array REPLACES the complete English array (arrays
 * are never merged by index).
 */
export type StudyContentTranslation = {
  mentalModel?: string;
  problem?: string;
  example?: string;
  howItWorks?: string[];
  commonMistakes?: string[];
  keyTerms?: { term: string; definition: string }[];
};

export type TopicTranslation = {
  name?: string;
  description?: string;
  studyNotes?: string;
  studyContent?: StudyContentTranslation;
};

export type CardTranslation = {
  title?: string;
  prompt?: string;
  answerStructureHint?: string;
  /** Keyed by the rubric item's id. */
  expectedPoints?: Record<string, { label?: string; description?: string }>;
  /** Keyed by the follow-up's id → translated prompt. */
  followUps?: Record<string, string>;
  /** Flashcard back-side texts; each field falls back to English. */
  flashcard?: { shortAnswer?: string; commonMistake?: string };
};

export type TopicI18n = Record<LangCode, TopicTranslation>;
export type CardI18n = Record<LangCode, CardTranslation>;
