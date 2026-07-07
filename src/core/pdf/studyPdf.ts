import type { QuestionCard, Topic } from "@/core/models";
import { MODE_LABELS } from "@/core/models";
import { allQuestions, allTopics } from "@/core/content/bank";

/**
 * Programmatic PDF export of the study material (pdfmake, fully client-side).
 * Unlike browser printing, page geometry and breaks are controlled here:
 * headings never orphan at the bottom of a page, and the "phone" format uses
 * a narrow page so the PDF reads comfortably fitted to a phone screen.
 */

export type StudyPdfFormat = "a4" | "phone";

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
};

// pdfmake's TS types are loose; the definition is plain data.
/* eslint-disable @typescript-eslint/no-explicit-any */

function glue(...nodes: any[]): any {
  return { stack: nodes.filter(Boolean), unbreakable: true };
}

function bullet(text: any, base: number, color?: string): any {
  return {
    ul: [{ text, fontSize: base - 1, ...(color ? { color } : {}), margin: [0, 0, 0, 2] }],
    margin: [4, 0, 0, 0],
  };
}

function sectionMarker(label: string, base: number): any {
  return {
    text: label,
    fontSize: base - 3,
    bold: true,
    color: "#777777",
    margin: [0, 3, 0, 2],
  };
}

function pointText(p: QuestionCard["expectedPoints"][number]): any {
  return [
    { text: `${p.label}${p.importance === "critical" ? " *" : ""}`, bold: true },
    ...(p.description ? [{ text: ` — ${p.description}`, color: "#444444" }] : []),
  ];
}

/**
 * Headings are glued to their first content line in small unbreakable
 * stacks, so a page can never end with an orphaned heading — and the stacks
 * stay well under the phone page height.
 */
function cardBlocks(card: QuestionCard, base: number): any[] {
  const blocks: any[] = [
    glue(
      {
        text: card.modes.slice(0, 2).map((m) => MODE_LABELS[m]).join(" · ").toUpperCase(),
        fontSize: base - 3,
        color: "#777777",
        margin: [0, 10, 0, 0],
      },
      { text: card.title, fontSize: base + 1, bold: true, margin: [0, 1, 0, 2] },
      { text: card.prompt, fontSize: base, color: "#333333", margin: [0, 0, 0, 3] },
    ),
  ];
  if (card.answerStructureHint) {
    blocks.push({
      text: [
        { text: "Structure: ", bold: true },
        { text: card.answerStructureHint },
      ],
      fontSize: base - 1,
      color: "#444444",
      margin: [0, 0, 0, 3],
    });
  }
  const [firstPoint, ...restPoints] = card.expectedPoints;
  blocks.push(
    glue(
      sectionMarker("A STRONG ANSWER COVERS", base),
      firstPoint ? bullet(pointText(firstPoint), base) : undefined,
    ),
  );
  blocks.push(...restPoints.map((p) => bullet(pointText(p), base)));

  if (card.followUps.length > 0) {
    const [firstFollowUp, ...restFollowUps] = card.followUps;
    blocks.push(
      glue(
        sectionMarker("LIKELY FOLLOW-UPS", base),
        bullet(firstFollowUp.prompt, base, "#444444"),
      ),
    );
    blocks.push(...restFollowUps.map((f) => bullet(f.prompt, base, "#444444")));
  }
  return blocks;
}

export function buildStudyPdfDefinition(format: StudyPdfFormat): any {
  // Phone format: narrow page + relatively large type, so "fit to width" on
  // a phone screen is comfortably legible.
  const base = format === "phone" ? 11 : 10;

  const cardsByTopicId = new Map<string, QuestionCard[]>();
  for (const card of allQuestions) {
    for (const topicId of card.topicIds) {
      cardsByTopicId.set(topicId, [
        ...(cardsByTopicId.get(topicId) ?? []),
        card,
      ]);
    }
  }
  const studyTopics = allTopics.filter((t) => cardsByTopicId.has(t.id));
  const byCategory = new Map<Topic["category"], Topic[]>();
  for (const t of studyTopics) {
    byCategory.set(t.category, [...(byCategory.get(t.category) ?? []), t]);
  }

  const content: any[] = [
    { text: "Interview Trainer — Study material", fontSize: base + 8, bold: true },
    {
      text: `${studyTopics.length} topics · ${allQuestions.length} question cards · exported ${new Date().toLocaleDateString("en-GB")} · * = critical point`,
      fontSize: base - 2,
      color: "#666666",
      margin: [0, 3, 0, 12],
    },
  ];

  for (const [category, topics] of [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const sorted = topics.sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach((topic, index) => {
      const categoryHeading =
        index === 0
          ? {
              text: CATEGORY_LABELS[category],
              fontSize: base + 5,
              bold: true,
              margin: [0, 12, 0, 2] as number[],
            }
          : undefined;
      content.push(
        glue(
          categoryHeading,
          {
            text: topic.name,
            fontSize: base + 3,
            bold: true,
            margin: [0, 8, 0, 1],
          },
          topic.description
            ? {
                text: topic.description,
                fontSize: base - 1,
                color: "#555555",
                margin: [0, 0, 0, 2],
              }
            : undefined,
        ),
      );
      for (const card of cardsByTopicId.get(topic.id) ?? []) {
        content.push(...cardBlocks(card, base));
      }
    });
  }

  return {
    pageSize: format === "phone" ? { width: 400, height: 710 } : "A4",
    pageMargins: format === "phone" ? [22, 26, 22, 30] : [48, 52, 48, 52],
    defaultStyle: { fontSize: base, lineHeight: 1.25 },
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: base - 3,
      color: "#999999",
    }),
    info: { title: "Interview Trainer — Study material" },
    content,
  };
}

/** Generates and downloads the PDF in the browser (pdfmake loaded lazily). */
export async function downloadStudyPdf(format: StudyPdfFormat): Promise<void> {
  const [{ default: pdfMake }, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const fonts = (fontsModule as any).default ?? fontsModule;
  (pdfMake as any).addVirtualFileSystem(fonts);
  const name = `interview-trainer-study-${format}.pdf`;
  await (pdfMake as any).createPdf(buildStudyPdfDefinition(format)).download(name);
}
