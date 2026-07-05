import type { Topic } from "@/core/models";

function topic(
  id: string,
  name: string,
  category: Topic["category"],
  description: string,
  relatedTopicIds: string[] = [],
): Topic {
  return {
    id,
    name,
    description,
    category,
    relatedTopicIds,
    status: "can_explain",
    userConfidence: 3,
  };
}

export const seedTopics: Topic[] = [
  // Backend
  topic("api_design", "API design", "backend", "Designing clear, consistent, evolvable APIs (REST, versioning, contracts).", ["rest", "idempotency"]),
  topic("rest", "REST", "backend", "REST principles, resource modeling, status codes, statelessness.", ["api_design"]),
  topic("authentication", "Authentication", "security", "Verifying identity: sessions, JWT, OAuth flows.", ["authorization"]),
  topic("authorization", "Authorization", "security", "Controlling access: roles, permissions, policies.", ["authentication"]),
  topic("sql", "SQL databases", "database", "Relational modeling, joins, constraints, normalization.", ["indexes", "transactions", "nosql"]),
  topic("nosql", "NoSQL databases", "database", "Document/key-value/wide-column stores and their trade-offs.", ["sql", "scalability"]),
  topic("transactions", "Transactions", "database", "ACID, isolation levels, locking, distributed transactions.", ["sql", "distributed_transactions"]),
  topic("indexes", "Database indexing", "database", "How indexes speed up reads and what they cost on writes.", ["sql"]),
  topic("caching", "Caching", "backend", "Cache-aside, TTL, invalidation, stampede protection, CDN/edge.", ["cdn", "scalability"]),
  topic("message_queue", "Message queues", "backend", "Async processing, delivery guarantees, DLQ, backpressure.", ["idempotency", "event_driven"]),
  topic("websocket", "WebSocket & realtime", "backend", "WebSocket vs SSE vs polling, connection management.", ["api_integration"]),
  topic("rate_limiting", "Rate limiting", "backend", "Protecting systems from overload and abuse.", ["scalability"]),
  topic("idempotency", "Idempotency", "backend", "Safe retries without duplicate side effects; idempotency keys.", ["retries", "message_queue"]),
  topic("retries", "Retries & timeouts", "backend", "Retry policies, exponential backoff, timeout budgets.", ["idempotency", "reliability"]),
  topic("observability", "Observability", "observability", "Metrics, logs, traces, alerting, SLOs.", ["reliability"]),
  topic("deployment", "Deployment", "devops", "Release strategies, rollbacks, blue/green, canary.", ["reliability"]),
  topic("security_basics", "Security basics", "security", "OWASP basics, input validation, secrets handling.", ["authentication"]),
  topic("background_jobs", "Background jobs", "backend", "Job scheduling, workers, queue backlog management.", ["message_queue"]),
  // Frontend
  topic("react", "React rendering", "frontend", "Render cycle, reconciliation, memoization, profiling.", ["frontend_performance", "state_management"]),
  topic("state_management", "State management", "frontend", "Local vs global state, server cache state, data flow.", ["react", "api_integration"]),
  topic("frontend_performance", "Frontend performance", "frontend", "Bundle size, rendering cost, Core Web Vitals, profiling.", ["react"]),
  topic("api_integration", "API integration", "fullstack", "Fetching, caching, loading/error states, optimistic UI.", ["state_management", "error_handling"]),
  topic("error_handling", "Error handling", "fullstack", "Error boundaries, retry UX, graceful degradation across layers.", ["api_integration"]),
  // Architecture
  topic("scalability", "Scalability", "architecture", "Horizontal/vertical scaling, bottlenecks, load distribution.", ["caching", "reliability"]),
  topic("reliability", "Reliability", "architecture", "Failure modes, redundancy, graceful degradation, SLAs.", ["observability", "retries"]),
  topic("event_driven", "Event-driven architecture", "architecture", "Events vs commands, eventual consistency, choreography.", ["message_queue", "microservices"]),
  topic("microservices", "Microservices", "architecture", "Service boundaries, data ownership, operational complexity.", ["modular_monolith", "distributed_transactions"]),
  topic("modular_monolith", "Modular monolith", "architecture", "Module boundaries without distribution costs.", ["microservices", "migration_strategy"]),
  topic("distributed_transactions", "Distributed transactions", "architecture", "Sagas, outbox pattern, eventual consistency.", ["transactions", "event_driven"]),
  topic("migration_strategy", "Migration strategy", "architecture", "Incremental migration, strangler fig, risk management.", ["modular_monolith", "risk_management"]),
  topic("requirements_clarification", "Requirements clarification", "soft_technical", "Asking the right questions before designing.", ["nfr"]),
  topic("nfr", "Non-functional requirements", "architecture", "Latency, availability, consistency, cost, compliance targets.", ["requirements_clarification", "cost_tradeoffs"]),
  topic("cost_tradeoffs", "Cost trade-offs", "cloud", "Cloud cost awareness in architectural decisions.", ["cloud", "build_vs_buy"]),
  // Cloud / solution
  topic("cloud", "Cloud services", "cloud", "Managed services, serverless, containers, storage choices.", ["build_vs_buy", "cost_tradeoffs"]),
  topic("build_vs_buy", "Build vs buy", "cloud", "Managed service vs custom build decision-making.", ["cloud", "risk_management"]),
  topic("risk_management", "Risk management", "soft_technical", "Identifying, communicating, and mitigating technical risk.", ["migration_strategy"]),
  topic("cdn", "CDN & edge", "cloud", "Edge caching, latency, static asset delivery.", ["caching"]),
];

export const seedTopicIds = new Set(seedTopics.map((t) => t.id));
