"use client";

import { useState } from "react";
import { Card, ModeBadge, PageHeader, buttonGhost, inputBase } from "@/components/ui";
import type { QuestionCard, Topic } from "@/core/models";
import { allQuestions, allTopics } from "@/core/content/bank";
import { downloadStudyPdf, type StudyPdfFormat } from "@/core/pdf/studyPdf";
import { normalizedIncludes } from "@/core/services/transcriptNormalizer";

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

// Static content — computed once at module load.
const cardsByTopicId = new Map<string, QuestionCard[]>();
for (const card of allQuestions) {
  for (const topicId of card.topicIds) {
    cardsByTopicId.set(topicId, [...(cardsByTopicId.get(topicId) ?? []), card]);
  }
}
const studyTopics = allTopics.filter((t) => cardsByTopicId.has(t.id));

function topicMatches(topic: Topic, query: string): boolean {
  if (!query.trim()) return true;
  if (normalizedIncludes(topic.name, query) || normalizedIncludes(query, topic.name)) {
    return true;
  }
  return (cardsByTopicId.get(topic.id) ?? []).some(
    (c) =>
      normalizedIncludes(c.title, query) || normalizedIncludes(c.prompt, query),
  );
}

function StudyCard({ card }: { card: QuestionCard }) {
  return (
    <Card className="mb-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {card.modes.slice(0, 2).map((m) => (
          <ModeBadge key={m} mode={m} />
        ))}
      </div>
      <p className="font-semibold">{card.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-secondary">{card.prompt}</p>
      {card.answerStructureHint && (
        <p className="mt-2 rounded-lg bg-background px-3 py-2 text-sm text-secondary">
          💡 <span className="font-medium text-foreground">Structure:</span>{" "}
          {card.answerStructureHint}
        </p>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
        A strong answer covers
      </p>
      <ul className="mt-1 flex flex-col gap-1.5">
        {card.expectedPoints.map((p) => (
          <li key={p.id} className="text-sm leading-relaxed">
            <span className="font-medium">{p.label}</span>
            {p.importance === "critical" && (
              <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                critical
              </span>
            )}
            {p.description && (
              <span className="block text-secondary">{p.description}</span>
            )}
          </li>
        ))}
      </ul>
      {card.followUps.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Likely follow-ups
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-secondary">
            {card.followUps.map((f) => (
              <li key={f.id}>{f.prompt}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export default function StudyPage() {
  const [query, setQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<StudyPdfFormat | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function generatePdf(format: StudyPdfFormat) {
    setGenerating(format);
    setPdfError(null);
    try {
      await downloadStudyPdf(format);
    } catch (e) {
      setPdfError(
        `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setGenerating(null);
    }
  }

  const selectedTopic = selectedTopicId
    ? studyTopics.find((t) => t.id === selectedTopicId)
    : null;

  if (selectedTopic) {
    const cards = cardsByTopicId.get(selectedTopic.id) ?? [];
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => setSelectedTopicId(null)}
          className={`${buttonGhost} -ml-3 mb-2`}
        >
          ← All topics
        </button>
        <PageHeader
          title={selectedTopic.name}
          subtitle={selectedTopic.description || undefined}
        />
        {cards.map((card) => (
          <StudyCard key={card.id} card={card} />
        ))}
      </div>
    );
  }

  const visibleTopics = studyTopics.filter((t) => topicMatches(t, query));
  const byCategory = new Map<Topic["category"], Topic[]>();
  for (const t of visibleTopics) {
    byCategory.set(t.category, [...(byCategory.get(t.category) ?? []), t]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Study"
        subtitle="Pick a topic and read the material without being quizzed: each question with what a strong answer covers."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={generating !== null}
              onClick={() => generatePdf("phone")}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
            >
              {generating === "phone" ? "Generating…" : "PDF · phone"}
            </button>
            <button
              type="button"
              disabled={generating !== null}
              onClick={() => generatePdf("a4")}
              className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm font-semibold hover:bg-background disabled:opacity-50"
            >
              {generating === "a4" ? "Generating…" : "PDF · A4"}
            </button>
          </div>
        }
      />

      {pdfError && (
        <p role="alert" className="mb-4 text-sm font-medium text-critical">
          {pdfError}
        </p>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search topics and questions…"
        aria-label="Search topics and questions"
        className={`${inputBase} mb-6`}
      />

      {visibleTopics.length === 0 && (
        <p className="py-10 text-center text-sm text-secondary">
          Nothing matches &quot;{query}&quot;.
        </p>
      )}

      {[...byCategory.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, topics]) => (
          <section key={category} className="mb-6">
            <h2 className="mb-2 font-bold">{CATEGORY_LABELS[category]}</h2>
            <div className="flex flex-col gap-2">
              {topics
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((topic) => {
                  const count = cardsByTopicId.get(topic.id)?.length ?? 0;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-left hover:bg-background sm:px-5"
                    >
                      <span>
                        <span className="text-sm font-semibold">{topic.name}</span>
                        {topic.description && (
                          <span className="block text-xs text-secondary">
                            {topic.description}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">
                        {count} card{count === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
    </div>
  );
}
