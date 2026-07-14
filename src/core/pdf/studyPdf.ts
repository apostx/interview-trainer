import type { LangCode, QuestionCard, Topic } from "@/core/models";
import { MODE_LABELS } from "@/core/models";
import { allQuestions, allTopics } from "@/core/content/bank";
import { DEFAULT_LANG, localizeCard, localizeTopic } from "@/core/content/i18n";
import {
  isDefinitionHeading,
  isProblemHeading,
  isTermsHeading,
  parseKeyTerm,
  parseStudyNotes,
  sectionLead,
} from "@/core/content/notes";

/**
 * Programmatic PDF export of the study material (pdfmake, fully client-side).
 * Design goals, in order: a question card never splits across pages (unless
 * it physically cannot fit one page), every category starts a new chapter
 * page, and the "phone" format uses a narrow page that reads comfortably
 * fitted to a phone screen. A table of contents links topics to pages.
 *
 * The "cards" format is different on purpose: a flashcard deck — one topic
 * per phone-sized page, essentials only (name, definition, key terms), on
 * the same warm paper with highlighter marks the Study view uses.
 */

export type StudyPdfFormat = "a4" | "phone" | "cards";

/** Visual variant of the flashcard deck (3 candidate designs to pick from). */
export type CardStyle = 1 | 2 | 3;

/** Optional export scope: a filtered card set, one topic, or everything. */
export type StudyPdfScope = {
  category?: Topic["category"];
  topicId?: string;
  /** Explicit card filter (role/source filtering in the study view). */
  cardIds?: string[];
  /** Human-readable scope name for the cover/filename. */
  name?: string;
  /** Filename slug when cardIds are used. */
  slug?: string;
  /** Study reading language; content falls back to English per field. */
  lang?: LangCode;
  /** Content bank to export (defaults to the live bank). */
  topics?: Topic[];
  questions?: QuestionCard[];
  /** Flashcard deck design (cards format only; ?cards=1..5). */
  cardStyle?: CardStyle;
};

const ACCENT = "#2a78d6";
const INK = "#1c2230";
const MUTED = "#6b7280";
const BODY = "#374151";
const CARD_BG = "#f7f8fa";
const CARD_BORDER = "#e2e5ea";

const CATEGORY_LABELS: Record<Topic["category"], string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Fullstack",
  architecture: "Architecture",
  cloud: "Cloud",
  security: "Security",
  database: "Database",
  devops: "DevOps",
  observability: "Observability",
  soft_technical: "Soft technical",
  core: "Core Engineering",
};

// pdfmake's TS types are loose; the definition is plain data.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Geometry = {
  base: number;
  pageSize: any;
  pageMargins: [number, number, number, number];
  usableHeight: number;
  charsPerLine: number;
};

function geometry(format: StudyPdfFormat): Geometry {
  if (format === "phone") {
    const pageMargins: [number, number, number, number] = [20, 24, 20, 30];
    return {
      // 15pt base: fitted to a phone screen the page is shown at roughly
      // physical size, and smaller sizes read uncomfortably there.
      base: 15,
      pageSize: { width: 400, height: 710 },
      pageMargins,
      usableHeight: 710 - 24 - 30,
      // ~360pt text width / ~7.2pt avg glyph at 14pt body
      charsPerLine: 50,
    };
  }
  const pageMargins: [number, number, number, number] = [46, 48, 46, 52];
  return {
    base: 10,
    pageSize: "A4",
    pageMargins,
    usableHeight: 842 - 48 - 52,
    charsPerLine: 105,
  };
}

/** Rough rendered-height estimate to decide if a card fits one page. */
function estimateCardHeight(card: QuestionCard, g: Geometry): number {
  const lineHeight = g.base * 1.3;
  const lines = (text: string, scale = 1) =>
    Math.max(1, Math.ceil(text.length / (g.charsPerLine * scale)));
  let n = 2; // mode label + spacing
  n += lines(card.title, 0.9);
  n += lines(card.prompt);
  if (card.answerStructureHint) n += lines(`Structure: ${card.answerStructureHint}`);
  n += 1.5; // section marker
  for (const p of card.expectedPoints) {
    n += lines(`${p.label} — ${p.description ?? ""}`) + 0.3;
  }
  if (card.followUps.length > 0) {
    n += 1.5;
    for (const f of card.followUps) n += lines(f.prompt) + 0.3;
  }
  return n * lineHeight + 30; // box padding
}

function sectionMarker(label: string, base: number): any {
  return {
    text: label,
    fontSize: base - 3.5,
    bold: true,
    characterSpacing: 0.6,
    color: ACCENT,
    margin: [0, 6, 0, 2],
  };
}

function pointItem(p: QuestionCard["expectedPoints"][number], base: number): any {
  return {
    text: [
      // Plain asterisk: the bundled Roboto has no BLACK STAR glyph.
      ...(p.importance === "critical"
        ? [{ text: "* ", color: ACCENT, bold: true }]
        : []),
      { text: p.label, bold: true, color: INK },
      ...(p.description ? [{ text: ` — ${p.description}`, color: BODY }] : []),
    ],
    fontSize: base - 1,
    margin: [0, 0, 0, 2.5],
  };
}

function notesBlocks(notes: string, base: number): any[] {
  const rendered = parseStudyNotes(notes).map((block) =>
    block.type === "h"
      ? { text: block.text, fontSize: base + 1, bold: true, color: INK, margin: [0, 6, 0, 2] }
      : block.type === "p"
        ? { text: block.text, fontSize: base - 0.5, color: BODY, margin: [0, 0, 0, 4], lineHeight: 1.35 }
        : {
            ul: (block as { items: string[] }).items.map((item) => ({
              text: item,
              fontSize: base - 0.5,
              color: BODY,
              margin: [0, 0, 0, 2],
            })),
            markerColor: MUTED,
            margin: [2, 0, 0, 4],
          },
  );
  // Glue each heading to the block that follows it, so a section title can
  // never sit alone at the bottom of a page with its content on the next.
  const blocks = parseStudyNotes(notes);
  const out: any[] = [];
  for (let i = 0; i < rendered.length; i++) {
    if (blocks[i].type === "h" && i + 1 < rendered.length) {
      out.push({ stack: [rendered[i], rendered[i + 1]], unbreakable: true });
      i++;
    } else {
      out.push(rendered[i]);
    }
  }
  return out;
}

function cardBox(card: QuestionCard, g: Geometry): any {
  const base = g.base;
  const inner: any[] = [
    {
      text: card.modes.slice(0, 2).map((m) => MODE_LABELS[m]).join("  ·  ").toUpperCase(),
      fontSize: base - 3.5,
      bold: true,
      characterSpacing: 0.6,
      color: MUTED,
    },
    { text: card.title, fontSize: base + 2, bold: true, color: INK, margin: [0, 2, 0, 3] },
    { text: card.prompt, fontSize: base, color: BODY, italics: true },
  ];
  if (card.answerStructureHint) {
    inner.push({
      text: [
        { text: "Structure: ", bold: true, color: INK },
        { text: card.answerStructureHint, color: BODY },
      ],
      fontSize: base - 1,
      margin: [0, 4, 0, 0],
    });
  }
  inner.push(sectionMarker("A STRONG ANSWER COVERS", base));
  inner.push({
    ul: card.expectedPoints.map((p) => pointItem(p, base)),
    markerColor: MUTED,
    margin: [2, 0, 0, 0],
  });
  if (card.followUps.length > 0) {
    inner.push(sectionMarker("LIKELY FOLLOW-UPS", base));
    inner.push({
      ul: card.followUps.map((f) => ({
        text: f.prompt,
        fontSize: base - 1,
        color: BODY,
        margin: [0, 0, 0, 2.5],
      })),
      markerColor: MUTED,
      margin: [2, 0, 0, 0],
    });
  }

  const fitsOnePage = estimateCardHeight(card, g) < g.usableHeight * 0.92;
  return {
    table: {
      widths: ["*"],
      body: [[{ stack: inner, margin: [10, 8, 10, 9], fillColor: CARD_BG }]],
    },
    layout: {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0.75,
      hLineColor: () => CARD_BORDER,
      vLineColor: () => CARD_BORDER,
    },
    margin: [0, 4, 0, 4],
    // Whole card stays on one page whenever it can physically fit.
    unbreakable: fitsOnePage,
  };
}

export function buildStudyPdfDefinition(
  format: StudyPdfFormat,
  scope: StudyPdfScope = {},
): any {
  const g = geometry(format);
  const base = g.base;
  const lang = scope.lang ?? DEFAULT_LANG;
  const bankTopics = scope.topics ?? allTopics;
  const bankQuestions = scope.questions ?? allQuestions;

  const cardIdSet = scope.cardIds ? new Set(scope.cardIds) : null;
  const scopedQuestions = cardIdSet
    ? bankQuestions.filter((q) => cardIdSet.has(q.id))
    : bankQuestions;
  const cardsByTopicId = new Map<string, QuestionCard[]>();
  for (const card of scopedQuestions) {
    if (scope.topicId) {
      // Single-topic export keeps every card that references the topic.
      for (const topicId of card.topicIds) {
        cardsByTopicId.set(topicId, [...(cardsByTopicId.get(topicId) ?? []), card]);
      }
    } else {
      // Otherwise a card appears only under its primary topic, so the
      // document never repeats the same card in several chapters.
      const primary = card.topicIds[0];
      cardsByTopicId.set(primary, [...(cardsByTopicId.get(primary) ?? []), card]);
    }
  }
  const studyTopics = bankTopics.filter((t) => {
    if (!cardsByTopicId.has(t.id) && !t.studyNotes) return false;
    if (cardIdSet && !cardsByTopicId.has(t.id)) return false;
    if (scope.topicId) return t.id === scope.topicId;
    if (scope.category) return t.category === scope.category;
    return true;
  });
  const scopedTopic = scope.topicId
    ? studyTopics.find((t) => t.id === scope.topicId)
    : undefined;
  const scopeName =
    scope.name ??
    (scopedTopic
      ? scopedTopic.name
      : scope.category
        ? CATEGORY_LABELS[scope.category]
        : null);
  const cardCount = new Set(
    studyTopics.flatMap((t) => (cardsByTopicId.get(t.id) ?? []).map((c) => c.id)),
  ).size;
  // Scoped exports list their topics in the contents; the full export lists
  // only the main categories so the contents never spills across pages.
  const topicsInToc = !!scopeName || !!cardIdSet;
  const byCategory = new Map<Topic["category"], Topic[]>();
  for (const t of studyTopics) {
    byCategory.set(t.category, [...(byCategory.get(t.category) ?? []), t]);
  }

  const content: any[] = [
    // Cover block + table of contents
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  text: "INTERVIEW TRAINER",
                  color: "#ffffff",
                  opacity: 0.85,
                  fontSize: base - 2,
                  bold: true,
                  characterSpacing: 1.2,
                },
                {
                  text: scopeName ? `Study material — ${scopeName}` : "Study material",
                  color: "#ffffff",
                  fontSize: base + 12,
                  bold: true,
                  margin: [0, 2, 0, 4],
                },
                {
                  text: `${studyTopics.length} topic${studyTopics.length === 1 ? "" : "s"} · ${cardCount} question card${cardCount === 1 ? "" : "s"} · ${new Date().toLocaleDateString("en-GB")}`,
                  color: "#ffffff",
                  opacity: 0.9,
                  fontSize: base - 1,
                },
              ],
              fillColor: ACCENT,
              margin: [14, 14, 14, 14],
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 10],
    },
    {
      text: [
        { text: "* ", color: ACCENT, bold: true },
        { text: "marks the critical points an interviewer expects to hear.", color: MUTED },
      ],
      fontSize: base - 1,
      margin: [0, 0, 0, 12],
    },
    {
      toc: {
        title: { text: "Contents", fontSize: base + 4, bold: true, color: INK, margin: [0, 0, 0, 6] },
        textStyle: { fontSize: base - 1, color: BODY },
      },
    },
  ];

  for (const [category, topics] of [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    // Chapter page per category
    content.push({
      pageBreak: "before",
      tocItem: !topicsInToc,
      tocStyle: { bold: true, color: INK },
      tocMargin: [0, 6, 0, 2],
      text: CATEGORY_LABELS[category],
      fontSize: base + 7,
      bold: true,
      color: INK,
      margin: [0, 0, 0, 1],
    });
    content.push({
      canvas: [
        { type: "rect", x: 0, y: 0, w: 64, h: 3, color: ACCENT },
      ],
      margin: [0, 2, 0, 10],
    });

    const sorted = topics
      .map((topic) => ({ topic, loc: localizeTopic(topic, lang) }))
      .sort((a, b) => a.loc.name.localeCompare(b.loc.name));
    sorted.forEach(({ topic, loc }, index) => {
      const header = [
        {
          text: loc.name,
          tocItem: topicsInToc,
          tocMargin: [12, 0, 0, 0],
          fontSize: base + 3,
          bold: true,
          color: INK,
          margin: [0, index === 0 ? 0 : 12, 0, 1],
        },
        ...(loc.description
          ? [{ text: loc.description, fontSize: base - 1, color: MUTED, margin: [0, 0, 0, 4] }]
          : []),
      ];
      const notes = loc.studyNotes ? notesBlocks(loc.studyNotes, base) : [];
      // The topic header travels with the first notes block, so a topic name
      // can never end a page while its material starts the next.
      content.push({
        stack: [...header, ...(notes.length > 0 ? [notes[0]] : [])],
        unbreakable: true,
      });
      content.push(...notes.slice(1));

      const topicCards = cardsByTopicId.get(topic.id) ?? [];
      if (topicCards.length > 0) {
        const label = {
          text: "PRACTICE CHECKS",
          fontSize: base - 3.5,
          bold: true,
          characterSpacing: 0.6,
          color: MUTED,
          margin: [0, 4, 0, 2],
        };
        const localized = topicCards.map((card) => localizeCard(card, lang));
        const [first, ...rest] = localized;
        // Keep the label with the first card when the pair fits a page.
        if (estimateCardHeight(first, g) < g.usableHeight * 0.85) {
          content.push({ stack: [label, cardBox(first, g)], unbreakable: true });
        } else {
          content.push(label, cardBox(first, g));
        }
        for (const card of rest) {
          content.push(cardBox(card, g));
        }
      }
    });
  }

  return {
    pageSize: g.pageSize,
    pageMargins: g.pageMargins,
    defaultStyle: { fontSize: base, lineHeight: 1.3 },
    footer: (currentPage: number, pageCount: number) =>
      currentPage === 1
        ? undefined
        : {
            columns: [
              { text: "Interview Trainer — Study material", fontSize: base - 3.5, color: MUTED, margin: [g.pageMargins[0], 0, 0, 0] },
              { text: `${currentPage} / ${pageCount}`, alignment: "right", fontSize: base - 3.5, color: MUTED, margin: [0, 0, g.pageMargins[2], 0] },
            ],
          },
    info: {
      title: scopeName
        ? `Interview Trainer — Study material — ${scopeName}`
        : "Interview Trainer — Study material",
    },
    content,
  };
}

// ---------------------------------------------------------------------------
// Flashcard deck ("cards" format): one topic per phone-sized page, essentials
// only — name, one-sentence definition, key terms. Five candidate designs.
// ---------------------------------------------------------------------------

type TermEntry = { term: string; def: string | null };

function keyTerms(notes: string | undefined): TermEntry[] {
  if (!notes) return [];
  const out: TermEntry[] = [];
  let inTerms = false;
  for (const block of parseStudyNotes(notes)) {
    if (block.type === "h") inTerms = isTermsHeading(block.text);
    else if (inTerms && block.type === "ul")
      out.push(...block.items.map(parseKeyTerm));
  }
  return out;
}

// Per-style palette; every style keeps the same information structure so the
// comparison is purely visual.
const CARD_STYLES = {
  1: {
    // "Paper & marker" — the Study reading surface: cream, highlighter, chips.
    name: "Paper & marker",
    bg: "#fdf8ec",
    ink: "#262115",
    soft: "#4c4636",
    label: "#8a8264",
    bodyLabel: "#8a8264",
    titleBg: "#ffd84d",
    titleColor: "#262115",
    chips: ["#ffe483", "#ffcfae", "#c9ecd2", "#cde4fb"],
    band: null,
  },
  2: {
    // "Index card" — white card, red top rule, ruled-line feel.
    name: "Index card",
    bg: "#fffdf6",
    ink: "#22222a",
    soft: "#4b4b55",
    label: "#9a9aa4",
    bodyLabel: "#9a9aa4",
    titleBg: null,
    titleColor: "#c2372e",
    chips: [],
    band: { type: "rule", color: "#c2372e" },
  },
  3: {
    // "Color block" — vivid warm header band, white body (Quizlet-like).
    name: "Color block",
    bg: "#ffffff",
    ink: "#1e1e24",
    soft: "#4c4c55",
    label: "#ffffff",
    bodyLabel: "#8b8b95",
    titleBg: null,
    titleColor: "#ffffff",
    chips: ["#ffe483", "#ffcfae", "#c9ecd2", "#cde4fb"],
    band: { type: "block", color: "#e8542f" },
  },
} as const;

const CARD_PAGE = { width: 400, height: 600 };
const CARD_MARGINS: [number, number, number, number] = [30, 34, 30, 40];
const BAND_HEIGHT = 130;
// Safety margin: the estimator is approximate, and a card that misses by a
// single line still spills — better to trim slightly too eagerly.
const CARD_USABLE = CARD_PAGE.height - CARD_MARGINS[1] - CARD_MARGINS[3] - 40;

// Rough height estimates (pt) for the card blocks, so a card never spills
// onto a second page: when it would, "Why it matters" is dropped first
// (definition + key terms are the flashcard core), then the terms tighten.
function estLines(text: string, charsPerLine: number): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function estimateFlashcard(
  name: string,
  definition: string,
  problem: string | null,
  terms: TermEntry[],
  hasBand: boolean,
): { total: number; whyHeight: number } {
  let h = 22; // category label
  h += estLines(name, 26) * 26 + (hasBand ? 65 : 12); // title + gap
  h += estLines(definition, 44) * 19; // 13.5pt body
  const whyHeight = problem ? 28 + estLines(problem, 48) * 18 : 0;
  if (terms.length > 0) {
    h += 34; // KEY TERMS label
    for (const t of terms) {
      h += estLines(`${t.term}  ${t.def ?? ""}`, 46) * 19 + 6;
    }
  }
  return { total: h + whyHeight, whyHeight };
}

export function buildFlashcardsDefinition(scope: StudyPdfScope = {}): any {
  const s = CARD_STYLES[scope.cardStyle ?? 1];
  const lang = scope.lang ?? DEFAULT_LANG;
  const bankTopics = scope.topics ?? allTopics;
  const bankQuestions = scope.questions ?? allQuestions;

  // Same scoping semantics as the study exports: an explicit card filter
  // keeps the topics that own at least one matching card.
  const cardIdSet = scope.cardIds ? new Set(scope.cardIds) : null;
  const topicsWithCards = new Set(
    (cardIdSet
      ? bankQuestions.filter((q) => cardIdSet.has(q.id))
      : bankQuestions
    ).map((q) => q.topicIds[0]),
  );
  const deckTopics = bankTopics
    .filter((t) => {
      if (!topicsWithCards.has(t.id) && !t.studyNotes) return false;
      if (cardIdSet && !topicsWithCards.has(t.id)) return false;
      if (scope.topicId) return t.id === scope.topicId;
      if (scope.category) return t.category === scope.category;
      return true;
    })
    .map((topic) => ({ topic, loc: localizeTopic(topic, lang) }))
    .sort(
      (a, b) =>
        a.topic.category.localeCompare(b.topic.category) ||
        a.loc.name.localeCompare(b.loc.name),
    );

  const deckName = scope.name ?? null;
  const hasBand = s.band?.type === "block";
  const content: any[] = [
    // Deck cover
    {
      stack: [
        {
          text: "INTERVIEW TRAINER",
          fontSize: 10,
          bold: true,
          characterSpacing: 1.2,
          color: hasBand ? s.label : s.label,
          margin: [0, hasBand ? 30 : 170, 0, 8],
        },
        {
          text: s.titleBg
            ? [{ text: ` ${deckName ?? "Flashcards"} `, background: s.titleBg, color: s.titleColor }]
            : { text: deckName ?? "Flashcards", color: hasBand ? s.titleColor : s.ink },
          fontSize: 24,
          bold: true,
          lineHeight: 1.2,
        },
        {
          text: `${deckTopics.length} card${deckTopics.length === 1 ? "" : "s"} · ${new Date().toLocaleDateString("en-GB")}`,
          fontSize: 11,
          color: hasBand ? s.ink : s.soft,
          margin: [0, hasBand ? 120 : 10, 0, 0],
        },
      ],
    },
  ];

  deckTopics.forEach(({ topic, loc }) => {
    const terms = keyTerms(loc.studyNotes);
    // The studyNotes teaching prose reads far better than the one-line UI
    // description, so the card leads with "What is it?" when it exists.
    const definition =
      sectionLead(loc.studyNotes, isDefinitionHeading) ?? loc.description;
    let problem = sectionLead(loc.studyNotes, isProblemHeading);
    const est = estimateFlashcard(loc.name, definition, problem, terms, hasBand);
    if (est.total > CARD_USABLE) problem = null;
    // Densest cards (long term lists) tighten instead of spilling.
    const tight = est.total - est.whyHeight > CARD_USABLE;
    const termSize = tight ? 11.5 : 12.5;
    const termGap = tight ? 3 : 6;
    const stack: any[] = [
      {
        text: CATEGORY_LABELS[topic.category].toUpperCase(),
        fontSize: 9,
        bold: true,
        characterSpacing: 1.1,
        color: s.label,
        margin: [0, 0, 0, 8],
      },
      {
        text: s.titleBg
          ? [{ text: ` ${loc.name} `, background: s.titleBg, color: s.titleColor }]
          : { text: loc.name, color: s.band?.type === "block" ? s.titleColor : s.ink },
        fontSize: 19,
        bold: true,
        lineHeight: 1.3,
        margin: [0, 0, 0, s.band?.type === "block" ? 65 : 12],
      },
      {
        text: definition,
        fontSize: 13.5,
        color: s.ink,
        lineHeight: 1.4,
      },
    ];
    if (problem) {
      stack.push(
        {
          text: "WHY IT MATTERS",
          fontSize: 9,
          bold: true,
          characterSpacing: 1.1,
          color: s.bodyLabel,
          margin: [0, 14, 0, 5],
        },
        { text: problem, fontSize: 12.5, color: s.soft, lineHeight: 1.4 },
      );
    }
    if (terms.length > 0) {
      stack.push({
        text: "KEY TERMS",
        fontSize: 9,
        bold: true,
        characterSpacing: 1.1,
        color: s.bodyLabel,
        margin: [0, 18, 0, 7],
      });
      for (const [j, t] of terms.entries()) {
        stack.push({
          text: [
            s.chips.length > 0
              ? { text: ` ${t.term} `, bold: true, background: s.chips[j % s.chips.length], color: s.ink }
              : { text: t.term, bold: true, color: s.ink },
            ...(t.def ? [{ text: `  ${t.def}`, color: s.soft }] : []),
          ],
          fontSize: termSize,
          lineHeight: tight ? 1.3 : 1.45,
          margin: [0, 0, 0, termGap],
        });
      }
    }
    content.push({ stack, pageBreak: "before" });
  });

  return {
    pageSize: CARD_PAGE,
    pageMargins: CARD_MARGINS,
    defaultStyle: { fontSize: 12.5, lineHeight: 1.35 },
    background: (currentPage: number, pageSize: any) => ({
      canvas: [
        { type: "rect", x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: s.bg },
        ...(s.band?.type === "block"
          ? [{ type: "rect", x: 0, y: 0, w: pageSize.width, h: BAND_HEIGHT, color: s.band.color }]
          : []),
        ...(s.band?.type === "rule"
          ? [
              { type: "line", x1: 0, y1: 58, x2: pageSize.width, y2: 58, lineWidth: 2, lineColor: s.band.color },
              ...Array.from({ length: 12 }, (_, k) => ({
                type: "line",
                x1: 0,
                y1: 100 + k * 40,
                x2: pageSize.width,
                y2: 100 + k * 40,
                lineWidth: 0.5,
                lineColor: "#dfe5ef",
              })),
            ]
          : []),
      ],
    }),
    footer: (currentPage: number, pageCount: number) =>
      currentPage === 1
        ? undefined
        : {
            text: `${currentPage - 1} / ${pageCount - 1}`,
            alignment: "center",
            fontSize: 9,
            color: s.bodyLabel,
          },
    info: {
      title: deckName
        ? `Interview Trainer — Flashcards — ${deckName}`
        : "Interview Trainer — Flashcards",
    },
    content,
  };
}

/** Generates and downloads the PDF in the browser (pdfmake loaded lazily). */
export async function downloadStudyPdf(
  format: StudyPdfFormat,
  scope: StudyPdfScope = {},
): Promise<void> {
  const [{ default: pdfMake }, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const fonts = (fontsModule as any).default ?? fontsModule;
  (pdfMake as any).addVirtualFileSystem(fonts);
  const slug = scope.slug ?? scope.topicId ?? scope.category ?? "all";
  const definition =
    format === "cards"
      ? buildFlashcardsDefinition(scope)
      : buildStudyPdfDefinition(format, scope);
  const name =
    format === "cards"
      ? `interview-trainer-cards-${slug}.pdf`
      : `interview-trainer-study-${slug}-${format}.pdf`;
  await (pdfMake as any).createPdf(definition).download(name);
}
