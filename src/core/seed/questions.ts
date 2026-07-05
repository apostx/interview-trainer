import type { QuestionCard, RubricItem } from "@/core/models";

// ---------------------------------------------------------------------------
// Shared rubric items (reused across cards and follow-ups)
// ---------------------------------------------------------------------------

const idempotencyRubricItem: RubricItem = {
  id: "idempotency",
  label: "Mentions idempotency / safe retries",
  description:
    "Candidate explains that retries should not create duplicate side effects.",
  importance: "critical",
  roleWeight: {
    backend_developer: 5,
    fullstack_developer: 4,
    backend_architect: 5,
    solution_architect: 4,
  },
  acceptedSignals: [
    "idempotency",
    "idempotent",
    "safe retry",
    "duplicate handling",
    "deduplication",
    "processing the same message twice should be safe",
    "idempotency key",
  ],
  weakSignals: ["retry", "try again", "avoid duplicates"],
  negativeSignals: ["just retry until it works"],
};

const observabilityRubricItem: RubricItem = {
  id: "observability",
  label: "Mentions monitoring / observability",
  description:
    "Candidate mentions metrics, logging, tracing, dashboards or alerting.",
  importance: "important",
  roleWeight: {
    backend_developer: 4,
    fullstack_developer: 3,
    backend_architect: 5,
    solution_architect: 4,
    frontend_architect: 4,
  },
  acceptedSignals: [
    "observability",
    "monitoring",
    "metrics",
    "alerting",
    "tracing",
    "dashboards",
    "logging",
  ],
  weakSignals: ["logs", "check the errors"],
};

const tradeoffFramingRubricItem: RubricItem = {
  id: "tradeoff_framing",
  label: "Frames answer around requirements ('it depends')",
  description:
    "Candidate anchors the decision in requirements and constraints instead of naming a single winner.",
  importance: "critical",
  roleWeight: {
    backend_developer: 4,
    fullstack_developer: 4,
    frontend_developer: 4,
    backend_architect: 5,
    frontend_architect: 5,
    solution_architect: 5,
  },
  acceptedSignals: [
    "it depends",
    "depends on the requirements",
    "depends on the use case",
    "what are the requirements",
    "constraints",
    "trade-off",
    "tradeoff",
  ],
  weakSignals: ["both have pros and cons"],
  negativeSignals: ["is always better", "never use"],
};

// ---------------------------------------------------------------------------
// Question cards
// ---------------------------------------------------------------------------

export const seedQuestions: QuestionCard[] = [
  // === Spec §18.1 — Backend Developer: Idempotent API endpoint ===
  {
    id: "backend_idempotency_001",
    title: "Idempotent API endpoint",
    prompt:
      "How would you design an idempotent API endpoint for creating an order?",
    roles: ["backend_developer", "fullstack_developer", "backend_architect"],
    modes: ["concept_check", "scenario_discussion"],
    topicIds: ["api_design", "idempotency", "retries"],
    expectedDurationSeconds: 180,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "Define idempotency, explain the duplicate request problem, propose idempotency keys, storage, response replay, and trade-offs.",
    expectedPoints: [
      {
        id: "defines_idempotency",
        label: "Defines idempotency",
        description:
          "Explains that repeated identical requests should not create repeated side effects.",
        importance: "critical",
        roleWeight: {
          backend_developer: 5,
          fullstack_developer: 4,
          backend_architect: 5,
        },
        acceptedSignals: [
          "same request multiple times",
          "no duplicate side effect",
          "safe retry",
          "idempotency",
          "same result",
        ],
        weakSignals: ["avoid duplicates"],
      },
      {
        id: "mentions_idempotency_key",
        label: "Uses idempotency key",
        description:
          "Mentions client-generated or server-issued idempotency key.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "idempotency key",
          "unique request key",
          "request identifier",
          "unique key",
          "client generated key",
        ],
      },
      {
        id: "key_storage_replay",
        label: "Explains key storage and response replay",
        description:
          "Mentions storing the key (with the response) and returning the stored response for duplicates.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 4 },
        acceptedSignals: [
          "store the key",
          "store the response",
          "return the same response",
          "replay the response",
          "unique constraint",
          "database constraint",
        ],
        weakSignals: ["save it somewhere"],
      },
    ],
    followUps: [
      {
        id: "idempotency_storage_followup",
        trigger: { type: "always" },
        prompt: "Where would you store the idempotency key and for how long?",
        expectedPoints: [],
      },
    ],
  },

  // === Spec §18.2 — Frontend Developer: Slow React page ===
  {
    id: "frontend_perf_001",
    title: "Slow React page",
    prompt:
      "A React page becomes slow as more data is loaded. How would you investigate and improve it?",
    roles: ["frontend_developer", "fullstack_developer", "frontend_architect"],
    modes: ["scenario_discussion", "troubleshooting"],
    topicIds: ["react", "frontend_performance", "api_integration"],
    expectedDurationSeconds: 240,
    thinkingTimeSeconds: 60,
    answerStructureHint:
      "Measure first, identify whether rendering or data is the bottleneck, then apply targeted fixes (memoization, virtualization, pagination).",
    expectedPoints: [
      {
        id: "profile_first",
        label: "Profiles before optimizing",
        description: "Mentions measuring/profiling before guessing.",
        importance: "critical",
        roleWeight: {
          frontend_developer: 5,
          fullstack_developer: 4,
          frontend_architect: 5,
        },
        acceptedSignals: [
          "profile",
          "react profiler",
          "measure first",
          "performance tab",
          "devtools",
          "measure",
        ],
      },
      {
        id: "unnecessary_rerenders",
        label: "Checks unnecessary re-renders",
        description:
          "Mentions render optimization and component re-render causes.",
        importance: "important",
        roleWeight: { frontend_developer: 5, frontend_architect: 5, fullstack_developer: 3 },
        acceptedSignals: [
          "unnecessary re-render",
          "re-render",
          "memo",
          "usememo",
          "usecallback",
          "react.memo",
        ],
      },
      {
        id: "data_volume_strategies",
        label: "Handles large data volumes",
        description:
          "Mentions virtualization, pagination, or reducing data on the page.",
        importance: "important",
        roleWeight: { frontend_developer: 4, fullstack_developer: 4, frontend_architect: 4 },
        acceptedSignals: [
          "virtualization",
          "virtualized list",
          "windowing",
          "pagination",
          "infinite scroll",
          "load less data",
          "lazy load",
        ],
      },
    ],
    followUps: [
      {
        id: "frontend_perf_api_followup",
        trigger: { type: "always" },
        prompt:
          "How would you know whether the bottleneck is frontend rendering or backend/API latency?",
        expectedPoints: [],
      },
    ],
  },

  // === Spec §18.3 — Solution Architect: Managed service vs custom build ===
  {
    id: "solution_managed_service_001",
    title: "Managed service vs custom build",
    prompt:
      "How would you decide whether to use a managed cloud service or build a custom solution?",
    roles: ["solution_architect", "backend_architect"],
    modes: ["tradeoff_decision"],
    topicIds: ["cloud", "cost_tradeoffs", "risk_management", "build_vs_buy"],
    expectedDurationSeconds: 240,
    thinkingTimeSeconds: 60,
    answerStructureHint:
      "Start from business requirements, compare operational burden, cost, flexibility and lock-in, then give a context-specific recommendation.",
    expectedPoints: [
      {
        id: "business_requirements",
        label: "Starts from business requirements",
        description:
          "Mentions requirements, constraints, and business goals before choosing technology.",
        importance: "critical",
        roleWeight: { solution_architect: 5, backend_architect: 3 },
        acceptedSignals: [
          "business requirement",
          "requirements",
          "constraints",
          "sla",
          "time to market",
        ],
      },
      {
        id: "operational_burden",
        label: "Considers operational burden",
        description:
          "Mentions maintenance, monitoring, patching, scaling, support.",
        importance: "critical",
        roleWeight: { solution_architect: 5, backend_architect: 5 },
        acceptedSignals: [
          "operational burden",
          "maintenance",
          "patching",
          "monitoring",
          "scaling",
          "support",
          "operations",
        ],
      },
      {
        id: "cost_and_lockin",
        label: "Weighs cost and vendor lock-in",
        description:
          "Mentions total cost of ownership and lock-in / exit strategy.",
        importance: "important",
        roleWeight: { solution_architect: 5, backend_architect: 4 },
        acceptedSignals: [
          "vendor lock-in",
          "lock-in",
          "total cost of ownership",
          "tco",
          "cost",
          "exit strategy",
        ],
        weakSignals: ["expensive"],
      },
    ],
    followUps: [
      {
        id: "managed_service_lockin_followup",
        trigger: { type: "always" },
        prompt: "How would you evaluate vendor lock-in in this decision?",
        expectedPoints: [],
      },
    ],
  },

  // === Concept checks ===
  {
    id: "backend_auth_001",
    title: "Authentication vs authorization",
    prompt:
      "What is the difference between authentication and authorization? Give a practical example of each.",
    roles: ["backend_developer", "fullstack_developer", "frontend_developer"],
    modes: ["concept_check"],
    topicIds: ["authentication", "authorization", "security_basics"],
    expectedDurationSeconds: 120,
    thinkingTimeSeconds: 30,
    answerStructureHint:
      "Short definition of each, a practical example, and where each is enforced in a real system.",
    expectedPoints: [
      {
        id: "authn_identity",
        label: "Authentication = verifying identity",
        description: "Explains that authentication answers 'who are you'.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 5, frontend_developer: 4 },
        acceptedSignals: [
          "who you are",
          "verify identity",
          "identity",
          "login",
          "prove who",
        ],
      },
      {
        id: "authz_permissions",
        label: "Authorization = checking permissions",
        description:
          "Explains that authorization answers 'what are you allowed to do'.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 5, frontend_developer: 4 },
        acceptedSignals: [
          "what you can do",
          "allowed to do",
          "permissions",
          "access control",
          "roles",
        ],
      },
      {
        id: "authn_example",
        label: "Gives concrete mechanisms",
        description:
          "Mentions concrete mechanisms such as JWT, sessions, OAuth, RBAC.",
        importance: "important",
        roleWeight: { backend_developer: 4, fullstack_developer: 4, frontend_developer: 3 },
        acceptedSignals: ["jwt", "session", "oauth", "rbac", "token", "role based"],
      },
    ],
    followUps: [
      {
        id: "auth_where_enforced_followup",
        trigger: { type: "always" },
        prompt:
          "Where would you enforce authorization in a typical web application, and why not only on the frontend?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "backend_indexing_001",
    title: "Database indexing",
    prompt: "What is database indexing and what is the trade-off?",
    roles: ["backend_developer", "fullstack_developer"],
    modes: ["concept_check"],
    topicIds: ["indexes", "sql"],
    expectedDurationSeconds: 120,
    thinkingTimeSeconds: 30,
    answerStructureHint:
      "Definition, how it speeds up reads, what it costs on writes and storage, when not to index.",
    expectedPoints: [
      {
        id: "index_speeds_reads",
        label: "Explains read speedup",
        description:
          "Explains that an index lets the database find rows without scanning the whole table.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "faster lookup",
          "avoid full table scan",
          "full scan",
          "b-tree",
          "find rows faster",
          "speed up queries",
          "faster reads",
        ],
      },
      {
        id: "index_write_cost",
        label: "Mentions write/storage cost",
        description:
          "Mentions that indexes slow down writes and consume storage.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "slower writes",
          "write cost",
          "insert slower",
          "update slower",
          "storage cost",
          "maintain the index",
        ],
      },
      {
        id: "index_selectivity",
        label: "Knows when indexing helps",
        description:
          "Mentions selectivity, query patterns, or composite indexes.",
        importance: "nice_to_have",
        roleWeight: { backend_developer: 4 },
        acceptedSignals: [
          "selectivity",
          "composite index",
          "query pattern",
          "cardinality",
          "covering index",
        ],
      },
    ],
    followUps: [
      {
        id: "indexing_verify_followup",
        trigger: { type: "always" },
        prompt: "How would you verify that a query is actually using an index?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "backend_dlq_001",
    title: "Dead letter queues",
    prompt: "What is a dead letter queue and when do you need one?",
    roles: ["backend_developer", "backend_architect"],
    modes: ["concept_check"],
    topicIds: ["message_queue", "reliability", "retries"],
    expectedDurationSeconds: 150,
    thinkingTimeSeconds: 30,
    answerStructureHint:
      "Definition, the poison message problem, retry exhaustion, and what to do with dead-lettered messages.",
    expectedPoints: [
      {
        id: "dlq_definition",
        label: "Defines DLQ",
        description:
          "Explains that failed messages are moved to a separate queue after retries are exhausted.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5 },
        acceptedSignals: [
          "dead letter",
          "dlq",
          "failed messages",
          "separate queue",
          "after retries",
          "poison message",
        ],
      },
      {
        id: "dlq_why",
        label: "Explains why it matters",
        description:
          "Mentions blocking the queue, infinite retries, or losing messages silently.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 5 },
        acceptedSignals: [
          "block the queue",
          "infinite retry",
          "retry forever",
          "lose messages",
          "backlog",
          "don't lose",
        ],
      },
      {
        id: "dlq_handling",
        label: "Explains DLQ handling",
        description:
          "Mentions alerting on DLQ, inspecting, fixing and replaying messages.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 4 },
        acceptedSignals: ["alert", "inspect", "replay", "reprocess", "investigate"],
      },
    ],
    followUps: [
      {
        id: "dlq_replay_followup",
        trigger: { type: "always" },
        prompt:
          "What risks do you see in replaying messages from a dead letter queue?",
        expectedPoints: [idempotencyRubricItem],
      },
    ],
  },
  {
    id: "backend_cache_invalidation_001",
    title: "Cache invalidation strategies",
    prompt:
      "What caching strategies do you know, and how do you keep cached data from going stale?",
    roles: ["backend_developer", "fullstack_developer", "backend_architect"],
    modes: ["concept_check"],
    topicIds: ["caching"],
    expectedDurationSeconds: 180,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "Name patterns (cache-aside, write-through), TTL vs explicit invalidation, and the consistency trade-off.",
    expectedPoints: [
      {
        id: "cache_patterns",
        label: "Names caching patterns",
        description:
          "Mentions cache-aside, write-through, write-behind or read-through.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 4, fullstack_developer: 4 },
        acceptedSignals: [
          "cache aside",
          "cache-aside",
          "write through",
          "write-through",
          "read through",
          "write behind",
          "lazy loading",
        ],
        weakSignals: ["redis", "in-memory cache"],
      },
      {
        id: "cache_invalidation",
        label: "Explains invalidation approaches",
        description: "Mentions TTL, explicit invalidation, or event-based invalidation.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "ttl",
          "time to live",
          "expiration",
          "invalidate",
          "invalidation",
          "evict",
          "bust the cache",
        ],
      },
      {
        id: "cache_consistency_tradeoff",
        label: "Mentions consistency trade-off",
        description:
          "Mentions stale reads vs performance, or stampede protection.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 5 },
        acceptedSignals: [
          "stale",
          "consistency",
          "stampede",
          "thundering herd",
          "eventual",
        ],
      },
    ],
    followUps: [
      {
        id: "cache_stampede_followup",
        trigger: { type: "rubric_missing", rubricItemId: "cache_consistency_tradeoff" },
        prompt:
          "What happens when a popular cache key expires under heavy traffic, and how would you protect against it?",
        expectedPoints: [],
      },
    ],
  },

  // === Scenario discussions ===
  {
    id: "backend_timeout_001",
    title: "API timeouts at peak traffic",
    prompt:
      "An API sometimes times out during peak traffic. How would you investigate it?",
    roles: ["backend_developer", "fullstack_developer", "backend_architect"],
    modes: ["scenario_discussion", "troubleshooting"],
    topicIds: ["scalability", "observability", "caching", "sql"],
    expectedDurationSeconds: 240,
    thinkingTimeSeconds: 60,
    answerStructureHint:
      "Scope the issue, check metrics/logs, isolate the bottleneck (db, downstream, resource limits), mitigate first, then fix root cause.",
    expectedPoints: [
      {
        id: "check_metrics_first",
        label: "Checks metrics and logs first",
        description:
          "Starts from data: latency percentiles, error rates, resource usage.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "metrics",
          "logs",
          "latency percentile",
          "p99",
          "p95",
          "cpu",
          "memory",
          "dashboards",
          "apm",
          "tracing",
        ],
      },
      {
        id: "isolate_bottleneck",
        label: "Isolates the bottleneck",
        description:
          "Mentions database, downstream services, connection pools or thread pools as candidate bottlenecks.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "connection pool",
          "slow query",
          "database bottleneck",
          "downstream",
          "thread pool",
          "bottleneck",
          "saturation",
        ],
      },
      {
        id: "mitigation_options",
        label: "Suggests mitigations",
        description:
          "Mentions caching, scaling out, rate limiting, timeouts/circuit breakers as mitigations.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 5 },
        acceptedSignals: [
          "cache",
          "scale out",
          "horizontal scaling",
          "rate limit",
          "circuit breaker",
          "timeout budget",
          "autoscaling",
        ],
      },
    ],
    followUps: [
      {
        id: "timeout_quickwin_followup",
        trigger: { type: "always" },
        prompt:
          "Traffic is peaking right now and users are affected. What would you do in the next 15 minutes?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "fullstack_duplicate_orders_001",
    title: "Duplicate orders on double click",
    prompt:
      "Users sometimes create duplicate orders by clicking the submit button twice. Where could the issue be and how would you fix it?",
    roles: ["fullstack_developer", "backend_developer", "frontend_developer"],
    modes: ["scenario_discussion"],
    topicIds: ["idempotency", "api_integration", "error_handling"],
    expectedDurationSeconds: 210,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "Cover both frontend (disable button, request state) and backend (idempotency key, unique constraint) — frontend alone is not enough.",
    expectedPoints: [
      {
        id: "frontend_prevention",
        label: "Frontend-side prevention",
        description:
          "Mentions disabling the button / tracking in-flight request state.",
        importance: "important",
        roleWeight: { fullstack_developer: 4, frontend_developer: 5, backend_developer: 2 },
        acceptedSignals: [
          "disable the button",
          "disable submit",
          "loading state",
          "in-flight",
          "pending state",
          "debounce",
        ],
      },
      {
        id: "backend_must_protect",
        label: "Backend must also protect",
        description:
          "States that the client cannot be trusted; the server needs its own protection.",
        importance: "critical",
        roleWeight: { fullstack_developer: 5, backend_developer: 5, frontend_developer: 4 },
        acceptedSignals: [
          "backend validation",
          "server side",
          "can't trust the client",
          "cannot trust the frontend",
          "server must",
          "backend protection",
        ],
      },
      idempotencyRubricItem,
      {
        id: "unique_constraint",
        label: "Concrete server mechanism",
        description:
          "Mentions unique constraints, idempotency keys or dedup tokens as the concrete mechanism.",
        importance: "important",
        roleWeight: { fullstack_developer: 4, backend_developer: 5 },
        acceptedSignals: [
          "unique constraint",
          "unique index",
          "idempotency key",
          "dedup",
          "token",
          "database constraint",
        ],
      },
    ],
    followUps: [
      {
        id: "duplicate_orders_network_followup",
        trigger: { type: "always" },
        prompt:
          "What if the first request succeeded on the server but the response was lost — the user retries. How does your solution handle that?",
        expectedPoints: [idempotencyRubricItem],
      },
    ],
  },
  {
    id: "architect_monolith_migration_001",
    title: "Monolith under pressure",
    prompt:
      "A team's monolith deploys are slow and risky, and they want to move to microservices. How would you approach this as an architect?",
    roles: ["backend_architect", "solution_architect"],
    modes: ["scenario_discussion", "tradeoff_decision"],
    topicIds: ["migration_strategy", "microservices", "modular_monolith", "risk_management"],
    expectedDurationSeconds: 300,
    thinkingTimeSeconds: 60,
    answerStructureHint:
      "Question the goal first (is microservices the right fix?), consider modular monolith, incremental strangler migration, and organizational readiness.",
    expectedPoints: [
      {
        id: "question_the_goal",
        label: "Questions whether microservices solve the problem",
        description:
          "Challenges the premise: slow deploys may be fixable without distribution (CI/CD, modularization).",
        importance: "critical",
        roleWeight: { backend_architect: 5, solution_architect: 5 },
        acceptedSignals: [
          "why microservices",
          "what problem",
          "root cause",
          "modular monolith",
          "improve ci",
          "deployment pipeline",
          "is it the right solution",
        ],
      },
      {
        id: "incremental_migration",
        label: "Proposes incremental migration",
        description:
          "Mentions strangler fig, extracting one service at a time, or defining module boundaries first.",
        importance: "critical",
        roleWeight: { backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "strangler",
          "incremental",
          "one service at a time",
          "extract a service",
          "step by step",
          "boundaries first",
          "domain boundaries",
        ],
        negativeSignals: ["big bang rewrite"],
      },
      {
        id: "distribution_costs",
        label: "Names the costs of distribution",
        description:
          "Mentions operational complexity, distributed transactions, network failures, or observability needs.",
        importance: "important",
        roleWeight: { backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "operational complexity",
          "distributed transaction",
          "network failure",
          "eventual consistency",
          "more infrastructure",
          "harder to debug",
          "observability",
        ],
      },
    ],
    followUps: [
      {
        id: "migration_first_service_followup",
        trigger: { type: "rubric_covered", rubricItemId: "incremental_migration" },
        prompt: "How would you choose which capability to extract first?",
        expectedPoints: [],
      },
    ],
  },

  // === Trade-off decisions ===
  {
    id: "tradeoff_sql_nosql_001",
    title: "SQL vs NoSQL",
    prompt:
      "How would you choose between a SQL and a NoSQL database for a new service?",
    roles: ["backend_developer", "fullstack_developer", "backend_architect", "solution_architect"],
    modes: ["tradeoff_decision"],
    topicIds: ["sql", "nosql", "scalability"],
    expectedDurationSeconds: 210,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "'It depends' + concrete criteria: data shape, query patterns, consistency needs, scale — and a default recommendation.",
    expectedPoints: [
      tradeoffFramingRubricItem,
      {
        id: "sql_strengths",
        label: "Knows SQL strengths",
        description:
          "Mentions relations, joins, ACID transactions, strong consistency, ad-hoc queries.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 4, fullstack_developer: 4, solution_architect: 4 },
        acceptedSignals: [
          "acid",
          "transactions",
          "joins",
          "relational",
          "strong consistency",
          "structured data",
          "ad hoc queries",
        ],
      },
      {
        id: "nosql_strengths",
        label: "Knows NoSQL strengths",
        description:
          "Mentions flexible schema, horizontal scaling, specific access patterns.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 4, fullstack_developer: 4, solution_architect: 4 },
        acceptedSignals: [
          "flexible schema",
          "schemaless",
          "horizontal scaling",
          "key value",
          "document",
          "access pattern",
          "denormalized",
        ],
      },
    ],
    followUps: [
      {
        id: "sql_nosql_default_followup",
        trigger: { type: "always" },
        prompt:
          "If the requirements are still unclear at project start, what would be your default choice and why?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "tradeoff_queue_vs_direct_001",
    title: "Queue vs direct API call",
    prompt:
      "When would you put a message queue between two services instead of a direct API call?",
    roles: ["backend_developer", "backend_architect", "solution_architect"],
    modes: ["tradeoff_decision"],
    topicIds: ["message_queue", "event_driven", "reliability"],
    expectedDurationSeconds: 210,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "Decoupling, load leveling and reliability vs added latency, complexity and eventual consistency.",
    expectedPoints: [
      {
        id: "queue_benefits",
        label: "Names queue benefits",
        description:
          "Mentions decoupling, absorbing spikes, retry/buffering, async processing.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "decouple",
          "decoupling",
          "absorb spikes",
          "load leveling",
          "buffer",
          "async",
          "asynchronous",
          "retry",
        ],
      },
      {
        id: "queue_costs",
        label: "Names queue costs",
        description:
          "Mentions eventual consistency, duplicate delivery, operational overhead, harder debugging.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "eventual consistency",
          "duplicate",
          "at least once",
          "operational overhead",
          "harder to debug",
          "latency",
          "complexity",
        ],
      },
      {
        id: "sync_needed_cases",
        label: "Knows when direct call is right",
        description:
          "Mentions cases needing an immediate response or strong consistency.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 4 },
        acceptedSignals: [
          "immediate response",
          "synchronous",
          "user is waiting",
          "read request",
          "query",
          "strong consistency",
        ],
      },
    ],
    followUps: [
      {
        id: "queue_duplicate_followup",
        trigger: { type: "topic_mentioned", topicId: "message_queue" },
        prompt: "How would you handle duplicate messages in this design?",
        expectedPoints: [idempotencyRubricItem],
      },
    ],
  },
  {
    id: "tradeoff_websocket_001",
    title: "WebSocket vs SSE vs polling",
    prompt:
      "You need to show live updates in a web app. How would you choose between WebSocket, server-sent events and polling?",
    roles: ["backend_developer", "fullstack_developer", "frontend_developer"],
    modes: ["tradeoff_decision", "concept_check"],
    topicIds: ["websocket", "api_integration"],
    expectedDurationSeconds: 210,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "Compare by direction (one-way vs two-way), frequency, infra constraints, and fallback/reconnect behavior.",
    expectedPoints: [
      tradeoffFramingRubricItem,
      {
        id: "websocket_bidirectional",
        label: "WebSocket = bidirectional",
        description:
          "Knows WebSocket suits two-way, high-frequency communication (chat, games).",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 5, frontend_developer: 4 },
        acceptedSignals: [
          "bidirectional",
          "two way",
          "both directions",
          "chat",
          "real-time",
          "persistent connection",
        ],
      },
      {
        id: "sse_polling_fit",
        label: "Knows SSE / polling fit",
        description:
          "SSE for one-way server push; polling is simple and fine for low frequency.",
        importance: "important",
        roleWeight: { backend_developer: 4, fullstack_developer: 4, frontend_developer: 4 },
        acceptedSignals: [
          "server sent events",
          "sse",
          "one way",
          "one-directional",
          "polling is simpler",
          "long polling",
          "low frequency",
        ],
      },
      {
        id: "connection_management",
        label: "Mentions operational concerns",
        description:
          "Mentions reconnection, scaling connections, proxies/load balancers, or sticky sessions.",
        importance: "nice_to_have",
        roleWeight: { backend_developer: 4, backend_architect: 5 },
        acceptedSignals: [
          "reconnect",
          "sticky session",
          "load balancer",
          "proxy",
          "connection limit",
          "scaling connections",
          "heartbeat",
        ],
      },
    ],
    followUps: [
      {
        id: "websocket_scale_followup",
        trigger: { type: "rubric_missing", rubricItemId: "connection_management" },
        prompt:
          "How would you scale this to 100k concurrently connected clients?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "tradeoff_micro_vs_monolith_001",
    title: "Microservices vs modular monolith",
    prompt:
      "For a new product with a team of eight developers, would you start with microservices or a modular monolith?",
    roles: ["backend_architect", "solution_architect", "backend_developer"],
    modes: ["tradeoff_decision"],
    topicIds: ["microservices", "modular_monolith", "scalability"],
    expectedDurationSeconds: 240,
    thinkingTimeSeconds: 60,
    answerStructureHint:
      "Anchor in team size, domain maturity and operational capacity; recommend a starting point and an evolution path.",
    expectedPoints: [
      tradeoffFramingRubricItem,
      {
        id: "monolith_first_reasoning",
        label: "Reasons about starting simple",
        description:
          "Mentions unclear domain boundaries early on, team size, and lower operational cost of a monolith.",
        importance: "critical",
        roleWeight: { backend_architect: 5, solution_architect: 5, backend_developer: 4 },
        acceptedSignals: [
          "boundaries are not clear",
          "domain is not stable",
          "start with a monolith",
          "modular monolith",
          "small team",
          "operational cost",
          "premature",
        ],
      },
      {
        id: "evolution_path",
        label: "Describes an evolution path",
        description:
          "Mentions keeping module boundaries clean so services can be extracted later.",
        importance: "important",
        roleWeight: { backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "extract later",
          "module boundaries",
          "clear interfaces",
          "split later",
          "evolve",
          "strangler",
        ],
      },
    ],
    followUps: [
      {
        id: "micro_when_followup",
        trigger: { type: "always" },
        prompt:
          "What concrete signals would tell you it's time to extract the first service?",
        expectedPoints: [],
      },
    ],
  },

  // === Troubleshooting ===
  {
    id: "troubleshoot_queue_backlog_001",
    title: "Queue backlog keeps growing",
    prompt:
      "A message queue backlog keeps growing in production. Walk me through how you would handle it.",
    roles: ["backend_developer", "backend_architect"],
    modes: ["troubleshooting"],
    topicIds: ["message_queue", "background_jobs", "observability", "scalability"],
    expectedDurationSeconds: 240,
    thinkingTimeSeconds: 60,
    answerStructureHint:
      "Producer vs consumer rates, consumer health/errors, mitigate (scale consumers, pause producers), then root cause and prevention.",
    expectedPoints: [
      {
        id: "producer_consumer_rate",
        label: "Compares producer vs consumer rate",
        description:
          "Identifies whether inflow increased or processing slowed down.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5 },
        acceptedSignals: [
          "producer rate",
          "consumer rate",
          "processing rate",
          "inflow",
          "throughput",
          "consumers slowed",
          "more messages coming in",
        ],
      },
      {
        id: "consumer_health",
        label: "Checks consumer health and errors",
        description:
          "Mentions consumer crashes, error loops, poison messages, slow downstream dependency.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5 },
        acceptedSignals: [
          "consumer errors",
          "crash loop",
          "poison message",
          "failing message",
          "retry loop",
          "downstream slow",
          "dependency",
        ],
      },
      {
        id: "backlog_mitigation",
        label: "Mitigates before root-causing",
        description:
          "Mentions scaling consumers, pausing non-critical producers, or shedding load first.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 5 },
        acceptedSignals: [
          "scale consumers",
          "add consumers",
          "more workers",
          "pause producer",
          "shed load",
          "mitigate first",
          "stop the bleeding",
        ],
      },
      observabilityRubricItem,
    ],
    followUps: [
      {
        id: "backlog_scale_consumers_followup",
        trigger: { type: "rubric_covered", rubricItemId: "backlog_mitigation" },
        prompt:
          "You scaled consumers to 10x but throughput barely improved. What would you check next?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "troubleshoot_slow_query_001",
    title: "Database query became slow",
    prompt:
      "A query that used to be fast became slow in production. How do you investigate?",
    roles: ["backend_developer", "fullstack_developer"],
    modes: ["troubleshooting"],
    topicIds: ["sql", "indexes", "observability"],
    expectedDurationSeconds: 210,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "Explain plan, index usage, data growth, plan changes, locking, recent deploys — measure before changing anything.",
    expectedPoints: [
      {
        id: "explain_plan",
        label: "Uses the query plan",
        description: "Mentions EXPLAIN / execution plan analysis.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "explain",
          "query plan",
          "execution plan",
          "explain analyze",
        ],
      },
      {
        id: "index_and_data_growth",
        label: "Considers indexes and data growth",
        description:
          "Mentions missing/unused index, table growth, or statistics drift.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "index not used",
          "missing index",
          "table grew",
          "data growth",
          "statistics",
          "full scan",
          "sequential scan",
        ],
      },
      {
        id: "environment_factors",
        label: "Considers environment factors",
        description:
          "Mentions locking/blocking, recent deploys or parameter changes, resource saturation.",
        importance: "important",
        roleWeight: { backend_developer: 4 },
        acceptedSignals: [
          "lock",
          "blocking",
          "recent deploy",
          "recent change",
          "cpu",
          "io",
          "connection pool",
          "vacuum",
        ],
      },
    ],
    followUps: [
      {
        id: "slow_query_fix_followup",
        trigger: { type: "always" },
        prompt:
          "The plan shows a full table scan on a 50M row table. What are your options, and what are their trade-offs?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "troubleshoot_stale_cache_001",
    title: "Cache returns stale data",
    prompt:
      "Users report seeing outdated data even after updating it. The system uses a cache. How would you debug and fix this?",
    roles: ["backend_developer", "fullstack_developer"],
    modes: ["troubleshooting"],
    topicIds: ["caching", "api_integration"],
    expectedDurationSeconds: 210,
    thinkingTimeSeconds: 45,
    answerStructureHint:
      "Locate all cache layers (browser, CDN, app, db), find which one is stale, check invalidation logic on the write path.",
    expectedPoints: [
      {
        id: "multiple_cache_layers",
        label: "Identifies multiple cache layers",
        description:
          "Mentions that caching can happen in browser, CDN, application and database layers.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 5 },
        acceptedSignals: [
          "browser cache",
          "cdn",
          "multiple layers",
          "http cache",
          "application cache",
          "which cache",
          "cache layers",
        ],
      },
      {
        id: "write_path_invalidation",
        label: "Checks invalidation on the write path",
        description:
          "Checks whether updates actually invalidate or update the cache entry.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 4 },
        acceptedSignals: [
          "invalidate on write",
          "invalidation logic",
          "update the cache",
          "evict on update",
          "cache key mismatch",
          "not invalidated",
        ],
      },
      {
        id: "stale_tradeoff",
        label: "Frames acceptable staleness",
        description:
          "Discusses TTL choice and how much staleness the business can accept.",
        importance: "nice_to_have",
        roleWeight: { backend_developer: 3, backend_architect: 4 },
        acceptedSignals: [
          "acceptable staleness",
          "how fresh",
          "shorter ttl",
          "business requirement",
          "consistency requirement",
        ],
      },
    ],
    followUps: [
      {
        id: "stale_cache_key_followup",
        trigger: { type: "always" },
        prompt:
          "How would you design cache keys so related entries can be invalidated together?",
        expectedPoints: [],
      },
    ],
  },

  // === System design ===
  {
    id: "design_notification_001",
    title: "Design a notification system",
    prompt:
      "Design a notification system that sends emails, SMS and push notifications to users based on events in the platform.",
    roles: ["backend_developer", "backend_architect", "solution_architect"],
    modes: ["system_design"],
    topicIds: ["message_queue", "idempotency", "rate_limiting", "observability", "event_driven", "scalability"],
    expectedDurationSeconds: 480,
    thinkingTimeSeconds: 90,
    answerStructureHint:
      "Clarify requirements → events → queue-based async processing → per-channel senders → retries + DLQ + idempotency → rate limiting + preferences → observability.",
    expectedPoints: [
      {
        id: "clarifies_requirements",
        label: "Clarifies requirements first",
        description:
          "Asks about scale, channels, latency expectations, delivery guarantees before designing.",
        importance: "critical",
        roleWeight: { backend_developer: 4, backend_architect: 5, solution_architect: 5 },
        acceptedSignals: [
          "clarify",
          "how many users",
          "what scale",
          "requirements",
          "delivery guarantee",
          "how fast",
          "which channels",
        ],
      },
      {
        id: "queue_async_processing",
        label: "Queue-based async processing",
        description:
          "Decouples event ingestion from sending using a queue.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "queue",
          "message queue",
          "async",
          "asynchronous",
          "kafka",
          "rabbitmq",
          "sqs",
          "event driven",
        ],
      },
      {
        id: "retry_and_dlq",
        label: "Retry policy and DLQ",
        description:
          "Handles provider failures with retries and a dead letter queue.",
        importance: "critical",
        roleWeight: { backend_developer: 5, backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "retry",
          "backoff",
          "dead letter",
          "dlq",
          "failed messages",
        ],
      },
      idempotencyRubricItem,
      {
        id: "rate_limiting_prefs",
        label: "Rate limiting and user preferences",
        description:
          "Avoids spamming users; respects channel preferences and quiet hours; protects providers.",
        importance: "important",
        roleWeight: { backend_developer: 4, backend_architect: 4, solution_architect: 4 },
        acceptedSignals: [
          "rate limit",
          "throttle",
          "user preferences",
          "opt out",
          "quiet hours",
          "batching",
          "digest",
        ],
      },
      observabilityRubricItem,
    ],
    followUps: [
      {
        id: "notification_ordering_followup",
        trigger: { type: "rubric_covered", rubricItemId: "queue_async_processing" },
        prompt:
          "Does notification ordering matter here? How would you handle events arriving out of order?",
        expectedPoints: [],
      },
      {
        id: "notification_observability_followup",
        trigger: { type: "rubric_missing", rubricItemId: "observability" },
        prompt: "How would you monitor this system in production?",
        expectedPoints: [observabilityRubricItem],
      },
    ],
  },
  {
    id: "design_file_upload_001",
    title: "Design a file upload system",
    prompt:
      "Design a file upload feature where users can upload documents up to 100 MB, which are then processed and shared.",
    roles: ["backend_developer", "fullstack_developer", "backend_architect"],
    modes: ["system_design"],
    topicIds: ["api_design", "cloud", "background_jobs", "security_basics", "scalability"],
    expectedDurationSeconds: 420,
    thinkingTimeSeconds: 90,
    answerStructureHint:
      "Direct-to-storage upload (presigned URLs), async processing pipeline, validation/scanning, resumability, access control.",
    expectedPoints: [
      {
        id: "direct_to_storage",
        label: "Uploads directly to object storage",
        description:
          "Uses presigned URLs / direct-to-storage upload instead of streaming through the API server.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 4, backend_architect: 5 },
        acceptedSignals: [
          "presigned url",
          "pre-signed",
          "direct to s3",
          "object storage",
          "blob storage",
          "not through the api server",
          "s3",
        ],
        weakSignals: ["upload to storage"],
      },
      {
        id: "async_processing_pipeline",
        label: "Processes files asynchronously",
        description:
          "Mentions background processing (virus scan, thumbnails, parsing) triggered after upload.",
        importance: "important",
        roleWeight: { backend_developer: 4, fullstack_developer: 4, backend_architect: 5 },
        acceptedSignals: [
          "background job",
          "async processing",
          "queue",
          "virus scan",
          "processing pipeline",
          "event when uploaded",
          "worker",
        ],
      },
      {
        id: "upload_validation_security",
        label: "Validates and secures uploads",
        description:
          "Mentions file type/size validation, scanning, and access control on shared files.",
        importance: "critical",
        roleWeight: { backend_developer: 5, fullstack_developer: 4, backend_architect: 4 },
        acceptedSignals: [
          "validate file type",
          "content type",
          "size limit",
          "virus",
          "malware",
          "access control",
          "permission",
          "signed url for download",
        ],
      },
      {
        id: "upload_ux_resumability",
        label: "Considers upload UX",
        description:
          "Mentions progress indication, resumable/chunked uploads, failure recovery.",
        importance: "nice_to_have",
        roleWeight: { fullstack_developer: 5, frontend_developer: 4, backend_developer: 3 },
        acceptedSignals: [
          "progress",
          "resumable",
          "chunked",
          "multipart",
          "retry upload",
        ],
      },
    ],
    followUps: [
      {
        id: "upload_failure_followup",
        trigger: { type: "always" },
        prompt:
          "The upload succeeded but the processing job failed. What does the user see, and how does the system recover?",
        expectedPoints: [],
      },
    ],
  },
  {
    id: "design_feature_flags_001",
    title: "Design a feature flag system",
    prompt:
      "Design a feature flag system used by multiple teams to roll out features gradually.",
    roles: ["backend_architect", "solution_architect", "backend_developer"],
    modes: ["system_design"],
    topicIds: ["api_design", "caching", "reliability", "deployment"],
    expectedDurationSeconds: 420,
    thinkingTimeSeconds: 90,
    answerStructureHint:
      "Flag model (targeting rules, percentages) → evaluation (SDK, local vs remote) → propagation/caching → failure behavior (defaults) → audit.",
    expectedPoints: [
      {
        id: "flag_evaluation_model",
        label: "Defines evaluation model",
        description:
          "Discusses targeting rules, percentage rollouts, user bucketing, environments.",
        importance: "critical",
        roleWeight: { backend_architect: 5, solution_architect: 4, backend_developer: 4 },
        acceptedSignals: [
          "targeting",
          "percentage rollout",
          "gradual rollout",
          "bucketing",
          "user segment",
          "environment",
          "rules",
        ],
      },
      {
        id: "flag_distribution",
        label: "Considers flag distribution and latency",
        description:
          "Mentions SDK-side caching/local evaluation, polling or streaming updates — flag checks must be fast.",
        importance: "critical",
        roleWeight: { backend_architect: 5, backend_developer: 4 },
        acceptedSignals: [
          "sdk",
          "local evaluation",
          "cache the flags",
          "poll",
          "streaming updates",
          "low latency",
          "in memory",
        ],
      },
      {
        id: "flag_failure_mode",
        label: "Defines failure behavior",
        description:
          "What happens when the flag service is down — safe defaults, last known values.",
        importance: "important",
        roleWeight: { backend_architect: 5, solution_architect: 4 },
        acceptedSignals: [
          "default value",
          "fallback",
          "last known",
          "fail safe",
          "service is down",
          "degrade",
        ],
      },
    ],
    followUps: [
      {
        id: "flag_cleanup_followup",
        trigger: { type: "always" },
        prompt: "How do you prevent hundreds of stale flags accumulating over time?",
        expectedPoints: [],
      },
    ],
  },
];

export function getQuestionCard(id: string): QuestionCard | undefined {
  return seedQuestions.find((q) => q.id === id);
}
