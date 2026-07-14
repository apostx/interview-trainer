import type { TopicCategory, TopicStatus } from "./types";
import type { TopicI18n } from "./Translation";

export type StudyKeyTerm = {
  term: string;
  definition: string;
};

/**
 * Structured educational content — the preferred authoring format. Section
 * headings are NOT stored here; the UI/PDF render localized labels. Field
 * limits are enforced by the pack schema (see docs/content-authoring.md);
 * the goal is a simple first mental model, not a complete reference.
 */
export type StudyContent = {
  /** 1–2 plain sentences with the central idea (max ~300 chars). */
  mentalModel: string;
  /** What goes wrong without the concept (max ~600 chars). */
  problem: string;
  /** One concrete, easy-to-follow example (optional only for content
   * mechanically migrated from legacy studyNotes — new content includes it). */
  example?: string;
  /** 2–5 simple steps. */
  howItWorks: string[];
  /** 2–4 common misunderstandings. */
  commonMistakes: string[];
  /** 1–5 terms needed to understand this page. */
  keyTerms: StudyKeyTerm[];
};

export type Topic = {
  id: string;
  name: string;
  description: string;
  category: TopicCategory;
  relatedTopicIds: string[];
  /** Legacy free-form educational prose (paragraphs, "## " headings, "- "
   * bullets). Superseded by `studyContent`; still rendered when only this
   * exists. When both are present, `studyContent` wins. */
  studyNotes?: string;
  /** Structured educational content (preferred over `studyNotes`). */
  studyContent?: StudyContent;
  /**
   * How essential the topic is for interviews (5 = asked almost always,
   * 1 = niche). Optional — untagged topics only show in the "All" filter.
   */
  importance?: 1 | 2 | 3 | 4 | 5;
  /** Study-only translations of name/description/studyNotes. */
  i18n?: TopicI18n;
  status: TopicStatus;
  userConfidence: 1 | 2 | 3 | 4 | 5;
};
