"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  PageHeader,
  selectCompact,
} from "@/components/ui";
import type { Topic, TopicStatus } from "@/core/models";
import { TOPIC_STATUS_LABELS } from "@/core/models";
import { loadedPacks, packErrors } from "@/core/content/bank";
import { syncSeedTopics } from "@/core/storage/db";
import { listTopics, saveTopic } from "@/core/storage/repositories";

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

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[] | null>(null);

  const reload = useCallback(async () => {
    await syncSeedTopics();
    setTopics(await listTopics());
  }, []);

  useEffect(() => {
    // Deferring past the effect body keeps state updates off the render pass.
    const id = setTimeout(reload, 0);
    return () => clearTimeout(id);
  }, [reload]);

  if (!topics) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-secondary">
        Loading…
      </div>
    );
  }

  const byCategory = new Map<Topic["category"], Topic[]>();
  for (const t of topics) {
    byCategory.set(t.category, [...(byCategory.get(t.category) ?? []), t]);
  }

  async function updateTopic(topic: Topic, patch: Partial<Topic>) {
    await saveTopic({ ...topic, ...patch });
    await reload();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Topic library"
        subtitle="Track what you can already explain and what still needs work."
      />

      <Card className="mb-6">
        <h2 className="text-sm font-bold">Content packs</h2>
        {loadedPacks.length === 0 ? (
          <p className="mt-1 text-sm text-secondary">
            No packs loaded. Drop JSON files into{" "}
            <code className="rounded bg-background px-1">content/packs/</code>{" "}
            to add your own questions — see docs/content-authoring.md.
          </p>
        ) : (
          <ul className="mt-2 text-sm text-secondary">
            {loadedPacks.map((p) => (
              <li key={p.id} className="py-0.5">
                <span className="font-medium text-foreground">{p.name}</span>{" "}
                ({p.fileName}) — {p.topicCount} topic
                {p.topicCount === 1 ? "" : "s"}, {p.questionCount} question
                {p.questionCount === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        )}
        {packErrors.length > 0 && (
          <div className="mt-2" role="alert">
            <p className="text-sm font-semibold text-critical">
              ❌ Some pack content was skipped:
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs text-critical">
              {packErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted">
              Run <code>npm run content:check</code> for details, fix the JSON
              and reload.
            </p>
          </div>
        )}
      </Card>

      {[...byCategory.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, list]) => (
          <section key={category} className="mb-6">
            <h2 className="mb-2 font-bold">{CATEGORY_LABELS[category]}</h2>
            <Card>
              <ul className="divide-y divide-hairline">
                {list
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((topic) => (
                    <li
                      key={topic.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{topic.name}</p>
                        <p className="text-xs text-secondary">
                          {topic.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <label className="sr-only" htmlFor={`status-${topic.id}`}>
                          Status of {topic.name}
                        </label>
                        <select
                          id={`status-${topic.id}`}
                          className={`${selectCompact} !text-xs`}
                          value={topic.status}
                          onChange={(e) =>
                            updateTopic(topic, {
                              status: e.target.value as TopicStatus,
                            })
                          }
                        >
                          {Object.entries(TOPIC_STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <label
                          className="sr-only"
                          htmlFor={`confidence-${topic.id}`}
                        >
                          Confidence in {topic.name}
                        </label>
                        <select
                          id={`confidence-${topic.id}`}
                          className={`${selectCompact} !text-xs`}
                          value={topic.userConfidence}
                          onChange={(e) =>
                            updateTopic(topic, {
                              userConfidence: Number(
                                e.target.value,
                              ) as Topic["userConfidence"],
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5].map((c) => (
                            <option key={c} value={c}>
                              Confidence {c}/5
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
              </ul>
            </Card>
          </section>
        ))}
    </div>
  );
}
