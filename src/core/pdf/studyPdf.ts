import type { LangCode, QuestionCard, Topic } from "@/core/models";
import { MODE_LABELS } from "@/core/models";
import { allQuestions, allTopics } from "@/core/content/bank";
import { DEFAULT_LANG, localizeCard, localizeTopic } from "@/core/content/i18n";
import { parseStudyNotes } from "@/core/content/notes";

/**
 * Programmatic PDF export of the study material (pdfmake, fully client-side).
 * Design goals, in order: a question card never splits across pages (unless
 * it physically cannot fit one page), every category starts a new chapter
 * page, and the "phone" format uses a narrow page that reads comfortably
 * fitted to a phone screen. A table of contents links topics to pages.
 */

export type StudyPdfFormat = "a4" | "phone";

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
      base: 11,
      pageSize: { width: 400, height: 710 },
      pageMargins,
      usableHeight: 710 - 24 - 30,
      // ~360pt text width / ~5.1pt avg glyph at 10pt body
      charsPerLine: 68,
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
  return parseStudyNotes(notes).map((block) =>
    block.type === "h"
      ? { text: block.text, fontSize: base + 1, bold: true, color: INK, margin: [0, 6, 0, 2] }
      : block.type === "p"
        ? { text: block.text, fontSize: base - 0.5, color: BODY, margin: [0, 0, 0, 4], lineHeight: 1.35 }
        : {
            ul: block.items.map((item) => ({
              text: item,
              fontSize: base - 0.5,
              color: BODY,
              margin: [0, 0, 0, 2],
            })),
            markerColor: MUTED,
            margin: [2, 0, 0, 4],
          },
  );
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
      content.push({
        stack: [
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
        ],
        unbreakable: true,
      });
      if (loc.studyNotes) {
        content.push(...notesBlocks(loc.studyNotes, base));
      }
      const topicCards = cardsByTopicId.get(topic.id) ?? [];
      if (topicCards.length > 0) {
        content.push({
          text: "PRACTICE CHECKS",
          fontSize: base - 3.5,
          bold: true,
          characterSpacing: 0.6,
          color: MUTED,
          margin: [0, 4, 0, 2],
        });
      }
      for (const card of topicCards) {
        content.push(cardBox(localizeCard(card, lang), g));
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
  const name = `interview-trainer-study-${slug}-${format}.pdf`;
  await (pdfMake as any)
    .createPdf(buildStudyPdfDefinition(format, scope))
    .download(name);
}
