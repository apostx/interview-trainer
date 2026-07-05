import { describe, expect, it } from "vitest";
import type { QuestionCard, Topic } from "@/core/models";
import { matchRubric } from "../rubricMatcher";
import { selectFollowUps } from "../followUpSelector";

const queueTopic: Topic = {
  id: "message_queue",
  name: "Message queues",
  description: "",
  category: "backend",
  relatedTopicIds: [],
  status: "can_explain",
  userConfidence: 3,
};

const card: QuestionCard = {
  id: "card1",
  title: "Test",
  prompt: "Design something.",
  roles: ["backend_developer"],
  modes: ["system_design"],
  topicIds: ["message_queue"],
  expectedDurationSeconds: 180,
  thinkingTimeSeconds: 30,
  expectedPoints: [
    {
      id: "dlq",
      label: "DLQ",
      description: "",
      importance: "critical",
      roleWeight: { backend_developer: 5 },
      acceptedSignals: ["dead letter"],
    },
    {
      id: "queue",
      label: "Queue",
      description: "",
      importance: "important",
      roleWeight: { backend_developer: 4 },
      acceptedSignals: ["queue"],
    },
  ],
  followUps: [
    {
      id: "f_always",
      trigger: { type: "always" },
      prompt: "Anything else?",
      expectedPoints: [],
    },
    {
      id: "f_covered",
      trigger: { type: "rubric_covered", rubricItemId: "queue" },
      prompt: "Dig deeper into the queue.",
      expectedPoints: [],
    },
    {
      id: "f_topic",
      trigger: { type: "topic_mentioned", topicId: "message_queue" },
      prompt: "How do you handle duplicates?",
      expectedPoints: [],
    },
    {
      id: "f_missing",
      trigger: { type: "rubric_missing", rubricItemId: "dlq" },
      prompt: "What about failed messages?",
      expectedPoints: [],
    },
  ],
};

const topicsById = new Map([[queueTopic.id, queueTopic]]);

describe("selectFollowUps", () => {
  it("prefers probing a missing critical rubric item", () => {
    const transcript = "I would use a message queue between the services.";
    const result = matchRubric(transcript, card.expectedPoints);
    const followUps = selectFollowUps(card, transcript, result, topicsById, 1);
    expect(followUps.map((f) => f.id)).toEqual(["f_missing"]);
  });

  it("falls back to mentioned topics when nothing critical is missing", () => {
    const transcript =
      "A message queue with a dead letter queue for failed messages.";
    const result = matchRubric(transcript, card.expectedPoints);
    const followUps = selectFollowUps(card, transcript, result, topicsById, 1);
    expect(followUps.map((f) => f.id)).toEqual(["f_topic"]);
  });

  it("uses 'always' as the last resort", () => {
    const transcript = "I would cache everything aggressively.";
    const result = matchRubric(transcript, card.expectedPoints);
    const withoutMissing = {
      ...card,
      followUps: card.followUps.filter(
        (f) => f.trigger.type !== "rubric_missing",
      ),
    };
    const followUps = selectFollowUps(
      withoutMissing,
      transcript,
      result,
      topicsById,
      1,
    );
    expect(followUps.map((f) => f.id)).toEqual(["f_always"]);
  });

  it("respects the limit", () => {
    const transcript = "I would use a message queue.";
    const result = matchRubric(transcript, card.expectedPoints);
    const followUps = selectFollowUps(card, transcript, result, topicsById, 2);
    expect(followUps).toHaveLength(2);
    expect(followUps[0].id).toBe("f_missing");
  });
});
