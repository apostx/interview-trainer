"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  PageHeader,
  buttonPrimary,
  inputBase,
  labelBase,
} from "@/components/ui";
import type { PracticeItem, Topic } from "@/core/models";
import { savePracticeItems, saveTopic } from "@/core/storage/repositories";

const CATEGORIES: Topic["category"][] = [
  "frontend",
  "backend",
  "fullstack",
  "architecture",
  "cloud",
  "security",
  "database",
  "devops",
  "observability",
  "soft_technical",
];

/**
 * Unknown topic intake (spec §8): a new topic starts as "unknown" and gets a
 * set of mini learning questions in the practice queue. It only enters
 * regular interview sessions once its status is raised past basic
 * understanding (or when "learning mode" is enabled in session setup).
 */
function buildLearningItems(topic: Topic, nowIso: string): PracticeItem[] {
  const prompts: { type: PracticeItem["type"]; prompt: string }[] = [
    { type: "concept_card", prompt: `Explain ${topic.name} in 60 seconds.` },
    {
      type: "concept_card",
      prompt: `What problem does ${topic.name} solve, and what is a simple example?`,
    },
    {
      type: "tradeoff_card",
      prompt: `When would ${topic.name} be overkill, and what are the trade-offs?`,
    },
    {
      type: "mini_scenario",
      prompt: `Describe a scenario where you would introduce ${topic.name}, and how you would justify it to the team.`,
    },
  ];
  return prompts.map((p, i) => ({
    id: `learn_${topic.id}_${i}_${Date.parse(nowIso)}`,
    type: p.type,
    topicIds: [topic.id],
    prompt: p.prompt,
    expectedPoints: [],
    nextReviewAt: nowIso,
    intervalDays: 1,
    easeFactor: 2.5,
    reviewHistory: [],
  }));
}

export default function NewTopicPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Topic["category"]>("architecture");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the topic a name.");
      return;
    }
    setSaving(true);
    setError(null);
    const id = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const topic: Topic = {
      id: id || `topic_${Date.now()}`,
      name: trimmed,
      description:
        description.trim() || `User-added topic: ${trimmed}. Still learning.`,
      category,
      relatedTopicIds: [],
      status: "unknown",
      userConfidence: 1,
    };
    const nowIso = new Date().toISOString();
    await saveTopic(topic);
    await savePracticeItems(buildLearningItems(topic, nowIso));
    router.push("/practice");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Add unknown topic"
        subtitle="New topics start in learning mode: you get mini questions in your practice queue before they appear in real interview sessions."
      />

      <Card className="flex flex-col gap-5">
        <div>
          <label className={labelBase} htmlFor="topic-name">
            Topic name
          </label>
          <input
            id="topic-name"
            className={inputBase}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Event Sourcing, CQRS, Service Mesh"
          />
        </div>
        <div>
          <label className={labelBase} htmlFor="topic-category">
            Category
          </label>
          <select
            id="topic-category"
            className={inputBase}
            value={category}
            onChange={(e) => setCategory(e.target.value as Topic["category"])}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelBase} htmlFor="topic-description">
            Description (optional)
          </label>
          <textarea
            id="topic-description"
            className={inputBase}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is it? What problem does it solve?"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-critical">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className={buttonPrimary}
        >
          {saving ? "Adding…" : "Add topic & create learning cards"}
        </button>
      </Card>
    </div>
  );
}
