import type {
  LangCode,
  QuestionCard,
  StudyContent,
  StudyContentTranslation,
  Topic,
} from "@/core/models";

/**
 * Applies Study-only translations with per-field English fallback. English
 * ("en") is the base: it has no translation entries, so localizing to "en"
 * (or to a language a given item does not translate) returns the original.
 */

export const DEFAULT_LANG: LangCode = "en";

/** Human labels for the selector; unknown codes fall back to the code itself. */
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hu: "Magyar",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  "pt-BR": "Português (BR)",
  nl: "Nederlands",
  pl: "Polski",
  ro: "Română",
  ru: "Русский",
  uk: "Українська",
  tr: "Türkçe",
};

export function languageLabel(code: LangCode): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

/** English plus every language any topic or card provides, sorted, en first. */
export function availableLanguages(
  topics: Topic[],
  cards: QuestionCard[],
): LangCode[] {
  const set = new Set<LangCode>();
  for (const t of topics) for (const k of Object.keys(t.i18n ?? {})) set.add(k);
  for (const c of cards) for (const k of Object.keys(c.i18n ?? {})) set.add(k);
  set.delete(DEFAULT_LANG);
  return [DEFAULT_LANG, ...[...set].sort()];
}

/** App-owned section labels for structured study content. The headings are
 * rendered by the UI/PDF (never stored in content); unknown languages fall
 * back to English. */
export type StudySection =
  | "mentalModel"
  | "problem"
  | "example"
  | "howItWorks"
  | "commonMistakes"
  | "keyTerms";

const STUDY_SECTION_LABELS: Record<string, Record<StudySection, string>> = {
  en: {
    mentalModel: "What is it?",
    problem: "What problem does it solve?",
    example: "Example",
    howItWorks: "How it works",
    commonMistakes: "Common mistakes",
    keyTerms: "Key terms",
  },
  hu: {
    mentalModel: "Mi ez?",
    problem: "Milyen problémát old meg?",
    example: "Példa",
    howItWorks: "Hogyan működik?",
    commonMistakes: "Gyakori hibák",
    keyTerms: "Kulcsfogalmak",
  },
};

export function studySectionLabel(section: StudySection, lang: LangCode): string {
  return (STUDY_SECTION_LABELS[lang] ?? STUDY_SECTION_LABELS.en)[section];
}

/** Scalars fall back per field; a provided translated array replaces the
 * complete English array (arrays are never merged by index). */
function mergeStudyContent(
  base: StudyContent | undefined,
  tr: StudyContentTranslation | undefined,
): StudyContent | undefined {
  if (!base || !tr) return base;
  return {
    mentalModel: tr.mentalModel ?? base.mentalModel,
    problem: tr.problem ?? base.problem,
    example: tr.example ?? base.example,
    howItWorks: tr.howItWorks ?? base.howItWorks,
    commonMistakes: tr.commonMistakes ?? base.commonMistakes,
    keyTerms: tr.keyTerms ?? base.keyTerms,
  };
}

export type LocalizedTopic = {
  name: string;
  description: string;
  studyNotes?: string;
  studyContent?: StudyContent;
};

export function localizeTopic(topic: Topic, lang: LangCode): LocalizedTopic {
  const tr = lang === DEFAULT_LANG ? undefined : topic.i18n?.[lang];
  return {
    name: tr?.name ?? topic.name,
    description: tr?.description ?? topic.description,
    studyNotes: tr?.studyNotes ?? topic.studyNotes,
    studyContent: mergeStudyContent(topic.studyContent, tr?.studyContent),
  };
}

/**
 * Returns a copy of the card with its displayed text localized (falling back
 * to English per field). Signals, roles, timings etc. are untouched — the
 * interview engine never sees this; only the Study view calls it.
 */
export function localizeCard(card: QuestionCard, lang: LangCode): QuestionCard {
  const tr = lang === DEFAULT_LANG ? undefined : card.i18n?.[lang];
  if (!tr) return card;
  return {
    ...card,
    title: tr.title ?? card.title,
    prompt: tr.prompt ?? card.prompt,
    answerStructureHint: tr.answerStructureHint ?? card.answerStructureHint,
    expectedPoints: card.expectedPoints.map((p) => {
      const pt = tr.expectedPoints?.[p.id];
      return pt
        ? { ...p, label: pt.label ?? p.label, description: pt.description ?? p.description }
        : p;
    }),
    followUps: card.followUps.map((f) => {
      const prompt = tr.followUps?.[f.id];
      return prompt ? { ...f, prompt } : f;
    }),
    flashcard: card.flashcard
      ? {
          shortAnswer: tr.flashcard?.shortAnswer ?? card.flashcard.shortAnswer,
          commonMistake:
            tr.flashcard?.commonMistake ?? card.flashcard.commonMistake,
        }
      : card.flashcard,
  };
}
