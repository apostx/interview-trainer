export type InterviewRole =
  | "frontend_developer"
  | "backend_developer"
  | "fullstack_developer"
  | "frontend_architect"
  | "backend_architect"
  | "solution_architect";

export type InterviewMode =
  | "concept_check"
  | "experience_deep_dive"
  | "scenario_discussion"
  | "tradeoff_decision"
  | "system_design"
  | "design_review"
  | "troubleshooting";

export type TopicDepthLevel = 1 | 2 | 3 | 4 | 5;

export type TopicStatus =
  | "unknown"
  | "basic_understanding"
  | "can_explain"
  | "can_apply_in_scenario"
  | "interview_ready";

export type RubricStatus = "covered" | "weak" | "missing";

export type TopicCategory =
  | "frontend"
  | "backend"
  | "fullstack"
  | "architecture"
  | "cloud"
  | "security"
  | "database"
  | "devops"
  | "observability"
  | "soft_technical";

export const INTERVIEW_ROLES: InterviewRole[] = [
  "frontend_developer",
  "backend_developer",
  "fullstack_developer",
  "frontend_architect",
  "backend_architect",
  "solution_architect",
];

export const INTERVIEW_MODES: InterviewMode[] = [
  "concept_check",
  "experience_deep_dive",
  "scenario_discussion",
  "tradeoff_decision",
  "system_design",
  "design_review",
  "troubleshooting",
];

export const ROLE_LABELS: Record<InterviewRole, string> = {
  frontend_developer: "Frontend",
  backend_developer: "Backend",
  fullstack_developer: "Fullstack",
  frontend_architect: "Frontend Architect",
  backend_architect: "Backend Architect",
  solution_architect: "Solution Architect",
};

/**
 * User-facing role tracks: architect knowledge is a baseline expectation for
 * seniors, so the UI merges developer + architect pairs. Content keeps the
 * six granular InterviewRole values; a track pulls in its member roles for
 * question selection and scoring.
 */
export const ROLE_TRACKS: InterviewRole[] = [
  "frontend_developer",
  "backend_developer",
  "fullstack_developer",
  "solution_architect",
];

export const TRACK_MEMBER_ROLES: Record<InterviewRole, InterviewRole[]> = {
  frontend_developer: ["frontend_developer", "frontend_architect"],
  backend_developer: ["backend_developer", "backend_architect"],
  fullstack_developer: ["fullstack_developer"],
  frontend_architect: ["frontend_architect", "frontend_developer"],
  backend_architect: ["backend_architect", "backend_developer"],
  solution_architect: ["solution_architect"],
};

export const MODE_LABELS: Record<InterviewMode, string> = {
  concept_check: "Concept Check",
  experience_deep_dive: "Experience Deep Dive",
  scenario_discussion: "Scenario Discussion",
  tradeoff_decision: "Trade-off Decision",
  system_design: "System Design",
  design_review: "Design Review",
  troubleshooting: "Troubleshooting",
};

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  unknown: "Unknown",
  basic_understanding: "Basic understanding",
  can_explain: "Can explain",
  can_apply_in_scenario: "Can apply in scenario",
  interview_ready: "Interview ready",
};
