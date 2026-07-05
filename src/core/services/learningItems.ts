import type { PracticeItem, Topic } from "@/core/models";

/**
 * Learning cards for a topic the user doesn't know yet (spec §8 intake).
 * Used by the topic intake screen and by the "I don't know this topic"
 * button on the review screen.
 */
export function buildLearningItems(topic: Topic, nowIso: string): PracticeItem[] {
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
