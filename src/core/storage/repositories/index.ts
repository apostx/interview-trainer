import type {
  InterviewSession,
  PracticeItem,
  Topic,
  TopicStatus,
  UserSettings,
} from "@/core/models";
import { DEFAULT_SETTINGS } from "@/core/models";
import { db } from "../db";

// --- Settings ---------------------------------------------------------------

export async function getSettings(): Promise<UserSettings> {
  const stored = await db.settings.get("user");
  // Merge so settings added in newer versions get their defaults.
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await db.settings.put({ ...settings, id: "user" });
}

// --- Sessions ---------------------------------------------------------------

export async function saveSession(session: InterviewSession): Promise<void> {
  await db.sessions.put(session);
}

export async function getSession(
  id: string,
): Promise<InterviewSession | undefined> {
  return db.sessions.get(id);
}

export async function listRecentSessions(
  limit = 10,
): Promise<InterviewSession[]> {
  return db.sessions.orderBy("startedAt").reverse().limit(limit).toArray();
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

// --- Practice items ----------------------------------------------------------

export async function savePracticeItems(items: PracticeItem[]): Promise<void> {
  if (items.length > 0) await db.practiceItems.bulkPut(items);
}

export async function savePracticeItem(item: PracticeItem): Promise<void> {
  await db.practiceItems.put(item);
}

export async function listDuePracticeItems(
  nowIso: string,
): Promise<PracticeItem[]> {
  return db.practiceItems.where("nextReviewAt").belowOrEqual(nowIso).toArray();
}

export async function listAllPracticeItems(): Promise<PracticeItem[]> {
  return db.practiceItems.orderBy("nextReviewAt").toArray();
}

// --- Topics -------------------------------------------------------------------

export async function listTopics(): Promise<Topic[]> {
  return db.topics.toArray();
}

export async function getTopicsById(): Promise<Map<string, Topic>> {
  const topics = await listTopics();
  return new Map(topics.map((t) => [t.id, t]));
}

export async function saveTopic(topic: Topic): Promise<void> {
  await db.topics.put(topic);
}

export async function updateTopicStatus(
  topicId: string,
  status: TopicStatus,
  userConfidence?: Topic["userConfidence"],
): Promise<void> {
  await db.topics.update(topicId, {
    status,
    ...(userConfidence ? { userConfidence } : {}),
  });
}
