"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { downloadStudyPdf } from "@/core/pdf/studyPdf";
import type { QuestionCard, Topic } from "@/core/models";
import { MODE_LABELS } from "@/core/models";
import { allQuestions, allTopics } from "@/core/content/bank";

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

const cardsByTopicId = new Map<string, QuestionCard[]>();
for (const card of allQuestions) {
  for (const topicId of card.topicIds) {
    cardsByTopicId.set(topicId, [...(cardsByTopicId.get(topicId) ?? []), card]);
  }
}
const studyTopics = allTopics.filter((t) => cardsByTopicId.has(t.id));
const byCategory = new Map<Topic["category"], Topic[]>();
for (const t of studyTopics) {
  byCategory.set(t.category, [...(byCategory.get(t.category) ?? []), t]);
}
const categories = [...byCategory.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
);

function PrintCard({ card }: { card: QuestionCard }) {
  return (
    <div className="break-inside-avoid rounded-lg border border-neutral-300 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {card.modes.slice(0, 2).map((m) => MODE_LABELS[m]).join(" · ")}
      </p>
      <p className="mt-0.5 text-[15px] font-bold text-neutral-900">{card.title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
        {card.prompt}
      </p>
      {card.answerStructureHint && (
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-700">
          <span className="font-semibold text-neutral-900">Structure: </span>
          {card.answerStructureHint}
        </p>
      )}
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
        A strong answer covers
      </p>
      <ul className="mt-1 flex flex-col gap-1 pl-4">
        {card.expectedPoints.map((p) => (
          <li key={p.id} className="list-disc text-[13px] leading-relaxed">
            <span className="font-semibold text-neutral-900">
              {p.label}
              {p.importance === "critical" ? " *" : ""}
            </span>
            {p.description && (
              <span className="text-neutral-700"> — {p.description}</span>
            )}
          </li>
        ))}
      </ul>
      {card.followUps.length > 0 && (
        <>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Likely follow-ups
          </p>
          <ul className="mt-1 pl-4">
            {card.followUps.map((f) => (
              <li key={f.id} className="list-disc text-[13px] leading-relaxed text-neutral-700">
                {f.prompt}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function StudyPrintPage() {
  // Filled after mount: the export date differs from the static build date,
  // so rendering it during hydration would mismatch the prerendered HTML.
  const [exportDate, setExportDate] = useState("");
  const [generating, setGenerating] = useState<"a4" | "phone" | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function generate(format: "a4" | "phone") {
    setGenerating(format);
    setPdfError(null);
    try {
      await downloadStudyPdf(format);
    } catch (e) {
      setPdfError(
        `PDF generation failed (${e instanceof Error ? e.message : String(e)}) — you can still use Print… as a fallback.`,
      );
    } finally {
      setGenerating(null);
    }
  }
  useEffect(() => {
    const id = setTimeout(
      () => setExportDate(new Date().toLocaleDateString("en-GB")),
      0,
    );
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/study" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
            ← Back to Study
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={generating !== null}
              onClick={() => generate("phone")}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {generating === "phone" ? "Generating…" : "Download PDF (phone)"}
            </button>
            <button
              type="button"
              disabled={generating !== null}
              onClick={() => generate("a4")}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
            >
              {generating === "a4" ? "Generating…" : "Download PDF (A4)"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Print…
            </button>
          </div>
        </div>
        {pdfError && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 print:hidden">
            {pdfError}
          </p>
        )}
        <p className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 print:hidden">
          The downloads are generated PDFs with controlled page breaks —
          &quot;phone&quot; uses a narrow page that reads comfortably on a
          mobile screen, &quot;A4&quot; is for desktop and paper. * marks
          critical points.
        </p>

        <header className="mb-8 border-b-2 border-neutral-900 pb-4">
          <h1 className="text-2xl font-bold">Interview Trainer — Study material</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {studyTopics.length} topics · {allQuestions.length} question cards
            {exportDate && ` · exported ${exportDate}`}
          </p>
        </header>

        {categories.map(([category, topics]) => (
          <section key={category} className="mb-8">
            <h2 className="mb-3 border-b border-neutral-300 pb-1 text-lg font-bold break-after-avoid-page">
              {CATEGORY_LABELS[category]}
            </h2>
            {topics
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((topic) => (
                <div key={topic.id} className="mb-5">
                  <h3 className="text-base font-bold break-after-avoid-page">{topic.name}</h3>
                  {topic.description && (
                    <p className="mb-2 text-[13px] text-neutral-600">
                      {topic.description}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    {(cardsByTopicId.get(topic.id) ?? []).map((card) => (
                      <PrintCard key={`${topic.id}_${card.id}`} card={card} />
                    ))}
                  </div>
                </div>
              ))}
          </section>
        ))}

        <footer className="border-t border-neutral-300 pt-3 text-center text-xs text-neutral-500">
          Generated by Interview Trainer · * = critical point
        </footer>
      </div>
    </div>
  );
}
