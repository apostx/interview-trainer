import type { TopicCategory, TopicStatus } from "./types";

export type Topic = {
  id: string;
  name: string;
  description: string;
  category: TopicCategory;
  relatedTopicIds: string[];
  status: TopicStatus;
  userConfidence: 1 | 2 | 3 | 4 | 5;
};
