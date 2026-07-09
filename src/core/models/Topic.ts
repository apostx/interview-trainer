import type { TopicCategory, TopicStatus } from "./types";

export type Topic = {
  id: string;
  name: string;
  description: string;
  category: TopicCategory;
  relatedTopicIds: string[];
  /** Educational prose for the Study view (paragraphs, "- " bullets). */
  studyNotes?: string;
  status: TopicStatus;
  userConfidence: 1 | 2 | 3 | 4 | 5;
};
