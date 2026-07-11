import type { TopicCategory, TopicStatus } from "./types";
import type { TopicI18n } from "./Translation";

export type Topic = {
  id: string;
  name: string;
  description: string;
  category: TopicCategory;
  relatedTopicIds: string[];
  /** Educational prose for the Study view (paragraphs, "- " bullets). */
  studyNotes?: string;
  /** Study-only translations of name/description/studyNotes. */
  i18n?: TopicI18n;
  status: TopicStatus;
  userConfidence: 1 | 2 | 3 | 4 | 5;
};
