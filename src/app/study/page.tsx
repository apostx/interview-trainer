"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, ModeBadge, PageHeader, inputBase } from "@/components/ui";
import type { QuestionCard, Topic } from "@/core/models";
import { allQuestions, allTopics } from "@/core/content/bank";
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
    <div className="border-t border-hairline py-4">
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
    </div>
  );
}

export default function StudyPage() {
  const [query, setQuery] = useState("");

  const visibleTopics = studyTopics.filter((t) => topicMatches(t, query));
  const byCategory = new Map<Topic["category"], Topic[]>();
  for (const t of visibleTopics) {
    byCategory.set(t.category, [...(byCategory.get(t.category) ?? []), t]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Study"
        subtitle="Read the material without being quizzed: every question with what a strong answer covers and the likely follow-ups."
        action={
          <Link
            href="/setup"
            className="text-sm font-medium text-accent hover:underline"
          >
            Practice instead →
          </Link>
        }
      />

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
                  const cards = cardsByTopicId.get(topic.id) ?? [];
                  return (
                    <Card key={topic.id} className="!p-0">
                      <details className="group">
                        <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
                          <span>
                            <span className="text-sm font-semibold">
                              {topic.name}
                            </span>
                            {topic.description && (
                              <span className="block text-xs text-secondary">
                                {topic.description}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">
                            {cards.length} card{cards.length === 1 ? "" : "s"}
                          </span>
                        </summary>
                        <div className="px-4 pb-4 sm:px-5">
                          {cards.map((card) => (
                            <StudyCard key={card.id} card={card} />
                          ))}
                        </div>
                      </details>
                    </Card>
                  );
                })}
            </div>
          </section>
        ))}
    </div>
  );
}
