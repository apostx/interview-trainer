import Dexie, { type EntityTable } from "dexie";
import type {
  InterviewSession,
  PracticeItem,
  Topic,
  UserSettings,
} from "@/core/models";
import { DEFAULT_SETTINGS } from "@/core/models";
import { allTopics } from "@/core/content/bank";

/**
 * Local-first persistence: everything lives in the browser's IndexedDB.
 * Question cards are static seed data in code; the database only stores
 * user state (topics with status/confidence, sessions, practice items,
 * settings).
 */
export const db = new Dexie("interview-trainer") as Dexie & {
  topics: EntityTable<Topic, "id">;
  sessions: EntityTable<InterviewSession, "id">;
  practiceItems: EntityTable<PracticeItem, "id">;
  settings: EntityTable<UserSettings, "id">;
};

db.version(1).stores({
  topics: "id, category, status",
  sessions: "id, role, startedAt",
  practiceItems: "id, nextReviewAt",
  settings: "id",
});

db.on("populate", (tx) => {
  tx.table("topics").bulkAdd(allTopics);
  tx.table("settings").add(DEFAULT_SETTINGS);
});

/**
 * Topics added to the seed after the user's DB was created are merged in
 * without touching existing user state.
 */
export async function syncSeedTopics(): Promise<void> {
  const existing = new Set((await db.topics.toCollection().primaryKeys()) as string[]);
  const missing = allTopics.filter((t) => !existing.has(t.id));
  if (missing.length > 0) await db.topics.bulkAdd(missing);
}
