# Developer Technical Interview Trainer – Product & Technical Specification

## 1. Product cél

Az alkalmazás célja egy olyan technikai interjúgyakorló rendszer létrehozása, amely fejlesztői és architect jellegű interjúkra készít fel, **coding interview nélkül**.

Az app nem tananyag-olvasó alkalmazás, hanem **interjú-szimulátor**:

- kérdez,
- hagy gondolkodni,
- rögzíti a hangos választ,
- speech-to-text segítségével leírja,
- rubric/checklist alapján értékeli,
- follow-up kérdéseket tesz fel,
- azonosítja a gyenge témákat,
- ismétlésre ütemezi őket.

A fő probléma, amit megold:

> A user sok témát elméletben ért, de interjún lefagy, elfelejti, nem tudja strukturáltan előhívni, vagy nem tudja architect-szerűen trade-offokkal megfogalmazni.

Az app elsődleges célja a **technikai tudás interjúhelyzetben történő előhívása**, nem pusztán a tananyag megtanítása.

---

## 2. Lefedett interjútípusok

Az appnak az alábbi technikai interjúformákat kell lefednie:

### Lefedett

- Frontend Developer technical interview
- Backend Developer technical interview
- Fullstack Developer technical interview
- Frontend Architect / Developer Architect Frontend interview
- Backend Architect / Developer Architect Backend interview
- Solution Architect interview
- Senior developer experience deep dive
- Scenario-based technical discussion
- System design / architecture discussion
- Troubleshooting interview
- Trade-off / decision-making interview
- Design review / architecture critique

### Nem cél

- Coding interview
- LeetCode / algorithmic coding tasks
- Live coding
- Take-home coding assignment evaluation

---

## 3. Core product principle

Az app ne role-onként különálló kurzusokat tartalmazzon, hanem egy közös interjúmotort.

A szerepkörök csak konfigurációk legyenek:

```txt
Role
  → Interview Mode
    → Competency Areas
      → Question Cards
        → Rubric Items
          → Follow-up Questions
            → Weakness Tracking
```

Ugyanaz a topic több role-ban is előfordulhat, de más súllyal és más elvárt mélységgel.

Példa:

Topic: Caching

Frontend Developer esetén:

- browser cache
- React Query / SWR
- stale data
- optimistic UI
- invalidation UX

Backend Developer esetén:

- Redis
- cache-aside
- TTL
- invalidation
- stampede protection

Solution Architect esetén:

- latency vs consistency
- CDN / edge cache
- cost
- failure modes
- business impact
- SLA / NFR trade-off

---

## 4. Target user

Elsődleges user:

- senior developer,
- frontend/backend/fullstack háttérrel,
- architect vagy senior technical role interjúkra készül,
- nem akar sokat gépelni,
- inkább beszélve gyakorolna,
- szeretné, hogy az app objektíven jelezze, mit hagyott ki,
- szeretné az ismeretlen témákat fokozatosan beépíteni.

Fontos UX elv:

> A user minél kevesebbet gépeljen. A fő input a hangos válasz legyen.

---

## 5. Fő role-ok

```ts
type InterviewRole =
  | "frontend_developer"
  | "backend_developer"
  | "fullstack_developer"
  | "frontend_architect"
  | "backend_architect"
  | "solution_architect";
```

### 5.1 Frontend Developer

Fókusz:

- JavaScript / TypeScript
- React
- state management
- rendering
- browser APIs
- API integration
- forms
- error/loading states
- accessibility
- frontend performance
- testing
- build tooling
- component architecture

### 5.2 Backend Developer

Fókusz:

- API design
- authentication / authorization
- database design
- SQL / NoSQL
- transactions
- caching
- queues
- concurrency
- scalability
- observability
- security basics
- deployment
- failure handling

### 5.3 Fullstack Developer

Fókusz:

- frontend-backend contract
- API integration
- validation frontend/backend oldalon
- auth flow end-to-end
- pagination
- file upload
- optimistic UI
- realtime updates
- error handling across layers
- performance user perspective-ből
- deployment coordination

### 5.4 Frontend Architect

Fókusz:

- frontend platform decisions
- design system
- microfrontends
- monorepo
- SSR / CSR / SSG decisions
- frontend observability
- migration strategy
- shared standards
- accessibility strategy
- frontend performance governance
- team enablement

### 5.5 Backend Architect

Fókusz:

- service boundaries
- distributed systems
- data ownership
- integration patterns
- event-driven architecture
- reliability
- scalability
- observability
- security
- migration from monolith
- operational complexity

### 5.6 Solution Architect

Fókusz:

- requirement clarification
- stakeholder communication
- business constraints
- non-functional requirements
- cloud services
- integration
- security / compliance
- cost
- migration roadmap
- vendor / managed service decisions
- documentation
- risk management

---

## 6. Interview mode-ok

```ts
type InterviewMode =
  | "concept_check"
  | "experience_deep_dive"
  | "scenario_discussion"
  | "tradeoff_decision"
  | "system_design"
  | "design_review"
  | "troubleshooting";
```

### 6.1 Concept Check

Rövid, 1–3 perces kérdések.

Cél:

- alapfogalmak előhívása,
- definíció + use case + trade-off gyakorlása.

Példák:

- What is the difference between authentication and authorization?
- When would you use WebSocket instead of polling?
- What is database indexing and what is the trade-off?
- What is hydration in frontend applications?
- What is idempotency?

Elvárt válaszstruktúra:

```txt
1. Short definition
2. Practical example
3. When to use it
4. Trade-off / limitation
```

---

### 6.2 Experience Deep Dive

A user saját korábbi tapasztalataiból kérdez.

Cél:

- senior / architect interjúkra való felkészítés,
- múltbeli projektek strukturált elmagyarázása,
- STAR/CAR jellegű válasz gyakorlása.

Példa kérdések:

- Tell me about a system you improved.
- Tell me about a difficult technical decision you made.
- Tell me about a time you had to debug a production issue.
- Tell me about a time you improved performance.
- Tell me about a time you worked across frontend and backend boundaries.

Elvárt válaszstruktúra:

```txt
1. Context
2. Problem
3. Constraints
4. Decision
5. Trade-off
6. Result
7. What I would do differently
```

---

### 6.3 Scenario Discussion

Közepes méretű gyakorlati helyzet.

Cél:

- technikai gondolkodás gyakorlása,
- nem teljes system design, hanem fókuszált probléma.

Példa frontend scenario:

```txt
A React application becomes slower as the product grows.
How would you investigate and improve it?
```

Példa backend scenario:

```txt
An API sometimes times out during peak traffic.
How would you investigate it?
```

Példa fullstack scenario:

```txt
Users sometimes create duplicate orders by clicking the submit button twice.
Where could the issue be and how would you fix it?
```

---

### 6.4 Trade-off Decision

Döntési kérdések.

Cél:

- architect-szerű gondolkodás,
- alternatívák összehasonlítása,
- “it depends” helyes használata.

Példák:

- REST vs GraphQL
- SQL vs NoSQL
- WebSocket vs SSE vs polling
- Microservices vs modular monolith
- Redis cache vs database optimization
- Queue vs direct API call
- SSR vs CSR
- Managed cloud service vs self-hosted service

Elvárt válaszstruktúra:

```txt
1. It depends on the requirements.
2. I would choose A if...
3. I would choose B if...
4. The trade-off is...
5. In this specific case I would start with...
```

---

### 6.5 System Design

Nagyobb design interjú.

Cél:

- teljes rendszertervezési gondolkodás gyakorlása,
- requirements → architecture → trade-offs → deep dive flow.

Példa feladatok:

- Design a notification system.
- Design a chat system.
- Design a booking system.
- Design a file upload system.
- Design a feature flag system.
- Design a real-time monitoring dashboard.
- Design a frontend architecture for a large SPA.
- Design a payment/order processing pipeline.

Elvárt válaszstruktúra:

```txt
1. Clarifying questions
2. Functional requirements
3. Non-functional requirements
4. Main entities / API / data model
5. High-level architecture
6. Data flow
7. Storage choice
8. Scaling strategy
9. Reliability / failure handling
10. Security
11. Observability
12. Cost / operational trade-offs
13. Summary
```

---

### 6.6 Design Review

Az app ad egy hibás vagy hiányos tervet, a usernek kritizálnia kell.

Cél:

- meglévő architektúra elemzése,
- hiányosságok azonosítása,
- jobb megoldás javaslása.

Példa:

```txt
A frontend page calls 8 backend APIs on page load.
Each request requires authentication.
There is no caching.
The page must load under 2 seconds.
What problems do you see?
```

Elvárt gondolkodás:

```txt
1. Identify bottlenecks
2. Identify reliability risks
3. Identify UX impact
4. Suggest quick improvements
5. Suggest longer-term improvements
6. Explain trade-offs
```

---

### 6.7 Troubleshooting

Production issue / debugging interjú.

Cél:

- strukturált hibakeresés gyakorlása.

Példa kérdések:

- API latency suddenly increased.
- WebSocket clients randomly disconnect.
- React bundle became too large.
- Database query became slow.
- Queue backlog keeps growing.
- Cache returns stale data.
- Deployment increased error rate.

Elvárt válaszstruktúra:

```txt
1. Scope the issue
2. Check metrics
3. Check logs
4. Check recent changes
5. Isolate bottleneck
6. Mitigate first
7. Find root cause
8. Prevent recurrence
```

---

## 7. Knowledge depth model

Minden topic kapjon mélységi szintet.

```ts
type TopicDepthLevel = 1 | 2 | 3 | 4 | 5;
```

Jelentés:

```txt
Level 1: I can define it.
Level 2: I can explain when to use it.
Level 3: I can compare it with alternatives.
Level 4: I can apply it in a scenario.
Level 5: I can defend the trade-off under follow-up questions.
```

A különböző role-oknál más mélység szükséges.

Példa:

```ts
type RoleDepthRequirement = {
  topicId: string;
  role: InterviewRole;
  requiredDepth: TopicDepthLevel;
};
```

Példák:

```txt
React rendering:
- Frontend Developer: 5
- Fullstack Developer: 3
- Backend Developer: 1
- Solution Architect: 1

API design:
- Frontend Developer: 3
- Backend Developer: 5
- Fullstack Developer: 5
- Backend Architect: 5
- Solution Architect: 4

Caching:
- Frontend Developer: 3
- Backend Developer: 5
- Fullstack Developer: 4
- Backend Architect: 5
- Solution Architect: 4

Cloud cost:
- Frontend Developer: 1
- Backend Developer: 2
- Backend Architect: 3
- Solution Architect: 5
```

---

## 8. Unknown topic pipeline

Az appnak külön kell kezelnie az ismeretlen témákat.

Ne dobjon be teljes mock interjúba olyan témát, amit a user még nem tanult meg alapszinten.

```ts
type TopicStatus =
  | "unknown"
  | "basic_understanding"
  | "can_explain"
  | "can_apply_in_scenario"
  | "interview_ready";
```

### Unknown Topic Intake flow

1. User hozzáad egy új témát:
   - például: `CQRS`, `Event Sourcing`, `Service Mesh`, `GraphQL Federation`.

2. Az app létrehoz egy tanító kártyát:

```txt
- What is it?
- What problem does it solve?
- When would you use it?
- When would you avoid it?
- What are the trade-offs?
- What is a simple example?
- What topics is it related to?
```

3. Az app mini kérdéseket generál:

```txt
- Explain CQRS in 60 seconds.
- When would CQRS be overkill?
- How is CQRS related to Event Sourcing?
- What is the read/write model trade-off?
```

4. Csak akkor kerül normál interjúkérdésbe, ha a user eléri legalább ezt:

```txt
- can explain basic idea
- can mention use case
- can mention trade-off
```

---

## 9. Core entities / data model

### 9.1 Topic

```ts
type Topic = {
  id: string;
  name: string;
  description: string;
  category:
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
  relatedTopicIds: string[];
  status: TopicStatus;
  userConfidence: 1 | 2 | 3 | 4 | 5;
};
```

### 9.2 Question Card

```ts
type QuestionCard = {
  id: string;
  title: string;
  prompt: string;
  roles: InterviewRole[];
  modes: InterviewMode[];
  topicIds: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  expectedDurationSeconds: number;
  thinkingTimeSeconds: number;
  answerStructureHint?: string;
  expectedPoints: RubricItem[];
  followUps: FollowUpQuestion[];
  sampleStrongAnswer?: string;
  sampleWeakAnswer?: string;
};
```

### 9.3 Rubric Item

```ts
type RubricItem = {
  id: string;
  label: string;
  description: string;
  importance: "critical" | "important" | "nice_to_have";
  roleWeight: Partial<Record<InterviewRole, number>>;
  acceptedSignals: string[];
  weakSignals?: string[];
  negativeSignals?: string[];
  examples?: string[];
};
```

Példa:

```ts
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
    solution_architect: 4
  },
  acceptedSignals: [
    "idempotency",
    "idempotent",
    "safe retry",
    "duplicate handling",
    "deduplication",
    "processing the same message twice should be safe",
    "idempotency key"
  ],
  weakSignals: [
    "retry",
    "try again",
    "avoid duplicates"
  ],
  negativeSignals: [
    "just retry until it works"
  ]
};
```

### 9.4 Follow-up Question

```ts
type FollowUpQuestion = {
  id: string;
  trigger:
    | { type: "rubric_covered"; rubricItemId: string }
    | { type: "rubric_missing"; rubricItemId: string }
    | { type: "topic_mentioned"; topicId: string }
    | { type: "always" };
  prompt: string;
  expectedPoints: RubricItem[];
  difficultyDelta?: -1 | 0 | 1;
};
```

Példa:

```ts
{
  id: "queue_duplicate_followup",
  trigger: {
    type: "topic_mentioned",
    topicId: "message_queue"
  },
  prompt: "How would you handle duplicate messages in this design?",
  expectedPoints: [
    idempotencyRubricItem
  ],
  difficultyDelta: 1
}
```

### 9.5 Interview Session

```ts
type InterviewSession = {
  id: string;
  role: InterviewRole;
  modes: InterviewMode[];
  startedAt: string;
  endedAt?: string;
  targetDurationMinutes: number;
  questions: SessionQuestion[];
  overallScore?: InterviewScore;
  weakTopicIds: string[];
};
```

### 9.6 Session Question

```ts
type SessionQuestion = {
  id: string;
  questionCardId: string;
  status: "pending" | "thinking" | "answering" | "reviewed" | "skipped";
  transcript?: string;
  audioUrl?: string;
  startedAt?: string;
  answeredAt?: string;
  review?: AnswerReview;
  followUpQuestionIds: string[];
};
```

### 9.7 Answer Review

```ts
type AnswerReview = {
  questionCardId: string;
  transcript: string;
  coveredRubricItemIds: string[];
  missingRubricItemIds: string[];
  weakRubricItemIds: string[];
  manualOverrides: ManualRubricOverride[];
  scores: {
    technicalCorrectness: number;
    structure: number;
    depth: number;
    tradeoffs: number;
    communication: number;
    roleFit: number;
  };
  totalScore: number;
  feedbackSummary: string;
  generatedPracticeItems: GeneratedPracticeItem[];
};
```

### 9.8 Manual Override

```ts
type ManualRubricOverride = {
  rubricItemId: string;
  previousStatus: "covered" | "missing" | "weak";
  newStatus: "covered" | "missing" | "weak";
  reason?: string;
};
```

### 9.9 Practice Item

```ts
type PracticeItem = {
  id: string;
  type: "concept_card" | "mini_scenario" | "tradeoff_card" | "followup_drill";
  topicIds: string[];
  prompt: string;
  expectedPoints: RubricItem[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  reviewHistory: PracticeReview[];
};
```

### 9.10 Practice Review

```ts
type PracticeReview = {
  reviewedAt: string;
  score: 0 | 1 | 2 | 3 | 4 | 5;
  transcript?: string;
  notes?: string;
};
```

---

## 10. Speech-to-text requirement

A user nem akar sokat gépelni, ezért a fő input legyen hangalapú.

### Preferred implementation

Client-side speech-to-text.

Javasolt megoldások:

1. **Transformers.js + Whisper model**
   - Browserben futtatható.
   - WebGPU támogatás előny.
   - Local-first működés.
   - Jó angol technikai válaszokhoz.

2. **whisper.cpp WASM**
   - Szintén local-first.
   - Desktopon jó lehet.
   - WASM workerben fusson.

3. **Web Speech API fallback**
   - Csak opcionális fallback.
   - Nem tekinthető teljesen local-first megoldásnak.
   - Browserfüggő.
   - MVP-ben feature flag mögé kerüljön.

### UX

A válaszadás flow:

```txt
1. Question shown
2. Thinking timer starts
3. User clicks "Start answer"
4. Microphone recording starts
5. Transcript appears live or after processing
6. User can optionally edit transcript
7. User clicks "Review answer"
8. App scores the answer
```

### Technical requirements

- Recording should use browser microphone API.
- Transcription should run in Web Worker where possible.
- Large model loading should show progress.
- Model should be cached locally.
- User should be able to select model size:
  - tiny / fast
  - base / balanced
  - small / more accurate
- MVP default: fast model.
- App should work without login.
- Audio should not leave the browser in local-first mode.

---

## 11. Review / scoring engine

Az értékelés ne legyen kizárólag AI-alapú.

Legyen hibrid:

```txt
1. Deterministic rubric matching
2. Semantic matching
3. Optional AI review
4. Manual user override
```

### 11.1 Deterministic rubric matching

Az app ellenőrizze, hogy a transcript tartalmaz-e elfogadott signalokat.

Példa:

```ts
function matchRubricItem(transcript: string, item: RubricItem): MatchResult {
  const normalized = normalize(transcript);

  const strongMatch = item.acceptedSignals.some(signal =>
    normalized.includes(normalize(signal))
  );

  const weakMatch = item.weakSignals?.some(signal =>
    normalized.includes(normalize(signal))
  );

  if (strongMatch) return "covered";
  if (weakMatch) return "weak";
  return "missing";
}
```

### 11.2 Semantic matching

A sima keyword matching nem elég.

Példa:

A user nem mondja ki azt, hogy `idempotency`, de ezt mondja:

```txt
Retries should be safe, so processing the same message twice should not create duplicate notifications.
```

Ez idempotencyként elfogadható.

Ezért később legyen semantic matching:

- small local embedding model,
- vagy optional server-side AI,
- vagy LLM-based review.

MVP-ben elég:

- keyword,
- synonym,
- manually maintained accepted phrases.

### 11.3 Optional AI review

Az AI review legyen opcionális, nem kizárólagos source of truth.

AI review prompt:

```txt
You are reviewing a technical interview answer.

Question:
{{question}}

Candidate transcript:
{{transcript}}

Rubric:
{{rubric}}

Rules:
- Only mark a rubric item as covered if the candidate clearly said it.
- Do not give credit for implied knowledge unless it is reasonably explicit.
- Be strict but fair.
- Return JSON only.

Return:
{
  "covered": ["rubric_item_id"],
  "weak": ["rubric_item_id"],
  "missing": ["rubric_item_id"],
  "feedbackSummary": "...",
  "followUpSuggestions": ["..."]
}
```

### 11.4 Manual correction

A review screen must show:

```txt
Queue / async processing: ✅ covered
Retry policy: ✅ covered
DLQ: ❌ missing
Idempotency: ⚠️ weak
Rate limiting: ❌ missing
Observability: ✅ covered
```

The user can click each item and change:

- covered
- weak
- missing

Manual overrides should be saved.

---

## 12. Score calculation

Each rubric item has:

- importance,
- role weight,
- status.

Suggested scoring:

```ts
type RubricStatus = "covered" | "weak" | "missing";

function rubricStatusScore(status: RubricStatus): number {
  if (status === "covered") return 1;
  if (status === "weak") return 0.5;
  return 0;
}
```

Importance weight:

```ts
const importanceWeight = {
  critical: 3,
  important: 2,
  nice_to_have: 1
};
```

Total item weight:

```ts
itemWeight = importanceWeight[item.importance] * roleWeightForCurrentRole;
```

Final score:

```ts
score = weightedCoveredPoints / totalPossibleWeightedPoints * 100;
```

Additional dimensions:

```ts
type ScoreDimension =
  | "technicalCorrectness"
  | "structure"
  | "depth"
  | "tradeoffs"
  | "communication"
  | "roleFit";
```

Initial MVP can calculate only one total score, then later break it down.

---

## 13. Dynamic follow-up logic

The app should ask follow-up questions based on the answer.

Examples:

If the user mentions queue:

```txt
How would you handle duplicate messages?
```

If the user mentions Redis cache:

```txt
How would you handle cache invalidation?
```

If the user mentions microservices:

```txt
How would you handle data consistency between services?
```

If the user forgets observability:

```txt
How would you monitor this system in production?
```

Follow-up selection algorithm:

```txt
1. Check mentioned topics.
2. Check missing critical rubric items.
3. Prefer one follow-up that probes the most important weakness.
4. Avoid more than 2 follow-ups per question in MVP.
```

---

## 14. Session generation

The user can start a session by selecting:

- role,
- duration,
- difficulty,
- interview modes,
- focus topics,
- include weak topics yes/no.

Example:

```txt
Role: Backend Architect
Duration: 30 minutes
Difficulty: Medium
Modes:
- concept_check
- scenario_discussion
- tradeoff_decision
- troubleshooting
- system_design
```

Generated session example:

```txt
1. Concept check: What is idempotency?
2. Scenario: API latency increases under peak traffic.
3. Trade-off: Queue vs direct API call.
4. Troubleshooting: Queue backlog keeps growing.
5. System design: Design a notification system.
```

Session generation should prioritize:

```txt
1. Due spaced repetition items
2. Weak topics
3. Role-critical topics
4. Unknown topics only in learning mode
5. Random variety
```

---

## 15. Spaced repetition

The app should schedule weak/missed topics for future review.

Simplified algorithm:

```ts
function calculateNextReview(score: 0 | 1 | 2 | 3 | 4 | 5, currentIntervalDays: number): number {
  if (score <= 1) return 1;
  if (score === 2) return Math.max(1, Math.round(currentIntervalDays * 1.2));
  if (score === 3) return Math.round(currentIntervalDays * 2);
  if (score === 4) return Math.round(currentIntervalDays * 3);
  return Math.round(currentIntervalDays * 4);
}
```

When a user misses a critical rubric item, generate a new practice item.

Example:

Question:

```txt
Design a notification system.
```

Missed:

```txt
Idempotency
DLQ
Rate limiting
```

Generated cards:

```txt
1. Explain idempotency in message processing.
2. When do you need a DLQ?
3. How would you rate limit notification sending?
```

---

## 16. Main screens

### 16.1 Dashboard

Shows:

- current role target,
- due practice items,
- weak topics,
- last session score,
- readiness by role,
- start session button.

Example:

```txt
Backend Architect readiness: 62%
Weak topics:
- Event-driven architecture
- Idempotency
- Distributed transactions
- Observability
```

### 16.2 Role Selection

User selects target role:

- Frontend Developer
- Backend Developer
- Fullstack Developer
- Frontend Architect
- Backend Architect
- Solution Architect

Each role shows:

- required topic groups,
- current readiness,
- weak areas.

### 16.3 Session Setup

Options:

```txt
Role
Duration
Difficulty
Interview modes
Focus topics
Include weak topics
Include unknown topics
Speech-to-text model
```

### 16.4 Question Screen

Displays:

- question title,
- prompt,
- role,
- mode,
- difficulty,
- thinking timer,
- answer timer,
- optional hint button,
- start recording button.

States:

```txt
idle
thinking
recording
transcribing
reviewing
reviewed
```

### 16.5 Transcript Screen

Displays:

- raw transcript,
- optional edit field,
- submit for review button.

The user should not be forced to edit.

### 16.6 Review Screen

Displays:

- score,
- covered points,
- weak points,
- missing points,
- suggested follow-up,
- generated practice cards,
- manual override controls.

Example:

```txt
Score: 68%

Covered:
✅ Queue-based async processing
✅ User preferences
✅ Retry policy

Weak:
⚠️ Observability

Missing:
❌ DLQ
❌ Idempotency
❌ Rate limiting
```

### 16.7 Topic Library

Shows all topics grouped by category.

Each topic has:

- status,
- confidence,
- required depth by role,
- due review date,
- related questions.

### 16.8 Unknown Topic Intake

User can add a topic manually.

Input:

```txt
Topic name: Event Sourcing
```

App creates:

- explanation card,
- decision card,
- mini questions,
- scenario questions,
- related topics.

For MVP this can be manually seeded instead of AI-generated.

---

## 17. Content structure

The app should ship with a seed question bank.

### 17.1 Topic groups

Frontend:

- JavaScript
- TypeScript
- React rendering
- React state management
- Forms
- Browser performance
- API integration
- Accessibility
- Frontend testing
- Build tooling
- Component design
- Error handling

Backend:

- API design
- REST
- GraphQL
- Authentication
- Authorization
- SQL
- NoSQL
- Transactions
- Indexes
- Caching
- Message queues
- WebSocket
- Background jobs
- Rate limiting
- Idempotency
- Observability
- Deployment
- Security basics

Fullstack:

- API contracts
- Validation
- Auth flows
- Pagination
- File uploads
- Optimistic UI
- Error handling across layers
- End-to-end performance
- Realtime features
- Release coordination

Architecture:

- Requirements clarification
- Non-functional requirements
- Scalability
- Reliability
- Resilience
- Fault tolerance
- Availability
- Consistency
- Event-driven architecture
- Microservices
- Modular monolith
- CQRS
- Event sourcing
- Distributed transactions
- Data ownership
- Migration strategy
- Cost trade-offs
- Security / compliance
- Observability strategy

Cloud / Solution Architecture:

- Managed services
- Build vs buy
- Cloud cost
- Networking basics
- IAM / permissions
- Storage choices
- CDN
- Serverless
- Containers
- Migration roadmap
- Stakeholder communication
- Documentation
- Risk management

---

## 18. Sample question cards

### 18.1 Backend Developer – Idempotency

```ts
const question: QuestionCard = {
  id: "backend_idempotency_001",
  title: "Idempotent API endpoint",
  prompt: "How would you design an idempotent API endpoint for creating an order?",
  roles: ["backend_developer", "fullstack_developer", "backend_architect"],
  modes: ["concept_check", "scenario_discussion"],
  topicIds: ["api_design", "idempotency", "retries"],
  difficulty: 3,
  expectedDurationSeconds: 180,
  thinkingTimeSeconds: 45,
  answerStructureHint:
    "Define idempotency, explain the duplicate request problem, propose idempotency keys, storage, response replay, and trade-offs.",
  expectedPoints: [
    {
      id: "defines_idempotency",
      label: "Defines idempotency",
      description: "Explains that repeated identical requests should not create repeated side effects.",
      importance: "critical",
      roleWeight: {
        backend_developer: 5,
        fullstack_developer: 4,
        backend_architect: 5
      },
      acceptedSignals: [
        "same request multiple times",
        "no duplicate side effect",
        "safe retry",
        "idempotency"
      ]
    },
    {
      id: "mentions_idempotency_key",
      label: "Uses idempotency key",
      description: "Mentions client-generated or server-issued idempotency key.",
      importance: "critical",
      roleWeight: {
        backend_developer: 5,
        backend_architect: 5
      },
      acceptedSignals: [
        "idempotency key",
        "unique request key",
        "request identifier"
      ]
    }
  ],
  followUps: [
    {
      id: "idempotency_storage_followup",
      trigger: { type: "always" },
      prompt: "Where would you store the idempotency key and for how long?",
      expectedPoints: []
    }
  ]
};
```

### 18.2 Frontend Developer – Slow React Page

```ts
const question: QuestionCard = {
  id: "frontend_perf_001",
  title: "Slow React page",
  prompt: "A React page becomes slow as more data is loaded. How would you investigate and improve it?",
  roles: ["frontend_developer", "fullstack_developer", "frontend_architect"],
  modes: ["scenario_discussion", "troubleshooting"],
  topicIds: ["react", "frontend_performance", "api_integration"],
  difficulty: 3,
  expectedDurationSeconds: 240,
  thinkingTimeSeconds: 60,
  expectedPoints: [
    {
      id: "profile_first",
      label: "Profiles before optimizing",
      description: "Mentions measuring/profiling before guessing.",
      importance: "critical",
      roleWeight: {
        frontend_developer: 5,
        fullstack_developer: 4,
        frontend_architect: 5
      },
      acceptedSignals: [
        "profile",
        "React Profiler",
        "measure first",
        "performance tab",
        "DevTools"
      ]
    },
    {
      id: "unnecessary_rerenders",
      label: "Checks unnecessary re-renders",
      description: "Mentions render optimization and component re-render causes.",
      importance: "important",
      roleWeight: {
        frontend_developer: 5,
        frontend_architect: 5
      },
      acceptedSignals: [
        "unnecessary re-render",
        "memo",
        "useMemo",
        "useCallback",
        "React.memo"
      ]
    }
  ],
  followUps: [
    {
      id: "frontend_perf_api_followup",
      trigger: { type: "always" },
      prompt: "How would you know whether the bottleneck is frontend rendering or backend/API latency?",
      expectedPoints: []
    }
  ]
};
```

### 18.3 Solution Architect – Managed Service Decision

```ts
const question: QuestionCard = {
  id: "solution_managed_service_001",
  title: "Managed service vs custom build",
  prompt: "How would you decide whether to use a managed cloud service or build a custom solution?",
  roles: ["solution_architect", "backend_architect"],
  modes: ["tradeoff_decision"],
  topicIds: ["cloud", "cost", "risk_management", "build_vs_buy"],
  difficulty: 4,
  expectedDurationSeconds: 240,
  thinkingTimeSeconds: 60,
  expectedPoints: [
    {
      id: "business_requirements",
      label: "Starts from business requirements",
      description: "Mentions requirements, constraints, and business goals before choosing technology.",
      importance: "critical",
      roleWeight: {
        solution_architect: 5,
        backend_architect: 3
      },
      acceptedSignals: [
        "business requirement",
        "requirements",
        "constraints",
        "SLA",
        "time to market"
      ]
    },
    {
      id: "operational_burden",
      label: "Considers operational burden",
      description: "Mentions maintenance, monitoring, patching, scaling, support.",
      importance: "critical",
      roleWeight: {
        solution_architect: 5,
        backend_architect: 5
      },
      acceptedSignals: [
        "operational burden",
        "maintenance",
        "patching",
        "monitoring",
        "scaling",
        "support"
      ]
    }
  ],
  followUps: [
    {
      id: "managed_service_lockin_followup",
      trigger: { type: "always" },
      prompt: "How would you evaluate vendor lock-in in this decision?",
      expectedPoints: []
    }
  ]
};
```

---

## 19. Recommended technical stack

### MVP frontend

- React
- TypeScript
- Vite
- Zustand or Redux Toolkit for app state
- IndexedDB via Dexie for local persistence
- Web Workers for transcription
- Tailwind or simple CSS modules
- No backend required for MVP

### Optional backend later

- Node.js / NestJS or Express
- PostgreSQL
- REST or tRPC API
- Authentication
- Cloud storage for audio/transcripts if user enables sync
- Optional LLM review endpoint

### Local-first storage

Use IndexedDB for:

- topics,
- question cards,
- sessions,
- transcripts,
- reviews,
- spaced repetition data,
- user settings.

---

## 20. Suggested module structure

```txt
src/
  app/
    App.tsx
    routes.tsx

  features/
    dashboard/
    role-selection/
    session-setup/
    interview-session/
    review/
    topic-library/
    unknown-topic-intake/

  core/
    models/
      Topic.ts
      QuestionCard.ts
      Rubric.ts
      Session.ts
      Review.ts

    services/
      sessionGenerator.ts
      rubricMatcher.ts
      scoringEngine.ts
      spacedRepetition.ts
      followUpSelector.ts
      transcriptNormalizer.ts

    speech/
      recorder.ts
      transcriber.ts
      whisperWorker.ts

    storage/
      db.ts
      repositories/

    seed/
      topics.ts
      questions.ts
      rubrics.ts
```

---

## 21. MVP requirements

### MVP must include

1. Role selection
2. Session setup
3. Static question bank
4. Speech recording
5. Client-side transcription or temporary text input fallback
6. Rubric-based scoring
7. Review screen
8. Manual override
9. Weak topic tracking
10. Basic spaced repetition
11. Local persistence

### MVP can skip

- user accounts,
- cloud sync,
- full AI review,
- embeddings,
- complex analytics,
- mobile optimization beyond basic responsiveness,
- custom question generation,
- automatic diagram generation.

---

## 22. MVP user flow

```txt
1. User opens app.
2. User selects role: Backend Architect.
3. User selects session: 30-minute mixed interview.
4. App generates 5 questions.
5. First question appears.
6. User gets thinking timer.
7. User records answer.
8. App transcribes answer.
9. App checks answer against rubric.
10. App shows covered/missing/weak points.
11. User manually corrects if needed.
12. App asks one follow-up.
13. At end, app shows summary:
    - total score
    - weak topics
    - generated practice cards
    - next recommended session
```

---

## 23. Session summary

At the end of each session show:

```txt
Role: Backend Architect
Duration: 28 minutes
Overall score: 64%

Strong areas:
- API design
- Queue-based async processing
- Basic scalability

Weak areas:
- Idempotency
- DLQ
- Observability
- Cost trade-offs

Recommended next practice:
1. Explain idempotency in message processing.
2. Troubleshoot a growing queue backlog.
3. Design monitoring for a notification system.
```

---

## 24. Non-functional requirements

### Performance

- App should start quickly.
- STT model loading may be slower, but must show progress.
- Transcription should not block UI.
- Use Web Worker for heavy processing.

### Privacy

- Default mode should be local-first.
- Audio and transcripts should stay in browser unless user explicitly enables cloud/AI review.
- Clear setting:
  - Local-only mode
  - AI-assisted mode

### Offline support

- Basic practice should work offline after initial load and model download.
- PWA support is desirable later.

### Accessibility

- Keyboard navigation.
- Large readable text.
- Clear timers.
- Transcript editable manually.
- Recording controls must be obvious.

---

## 25. Settings

User settings:

```ts
type UserSettings = {
  targetRole: InterviewRole;
  defaultSessionDurationMinutes: number;
  defaultDifficulty: 1 | 2 | 3 | 4 | 5;
  preferredSpeechModel: "tiny" | "base" | "small";
  localOnlyMode: boolean;
  enableAiReview: boolean;
  showHintsDuringInterview: boolean;
  autoGenerateFollowUps: boolean;
};
```

---

## 26. AI usage boundaries

The app may use AI for:

- optional answer review,
- question generation,
- unknown topic explanation,
- follow-up generation,
- sample strong answer generation.

The app should not rely fully on AI for:

- scoring,
- deciding whether the user is “ready”,
- storing final truth.

AI review must always be inspectable and manually correctable.

---

## 27. Future roadmap

### Phase 1 – MVP

- Local app
- Static content
- Speech-to-text
- Rubric matching
- Basic scoring
- Manual override
- Weak topic tracking

### Phase 2 – Better intelligence

- AI review
- Semantic matching
- Dynamic follow-up generation
- Unknown topic AI intake
- Better spaced repetition
- Answer quality trends

### Phase 3 – Advanced interview simulation

- Full mock interview mode
- Interviewer persona
- Difficulty adaptation
- Role-specific readiness score
- Voice-based follow-ups
- Exportable progress report

### Phase 4 – Collaborative / product version

- User accounts
- Cloud sync
- Custom role templates
- Shared question packs
- Recruiter/company-specific prep packs
- Team/admin mode

---

## 28. Definition of done for MVP

The MVP is done when the user can:

1. Select a target role.
2. Start a mixed technical interview session.
3. Answer at least 5 questions by voice or text.
4. Get transcript.
5. Get rubric-based feedback.
6. See covered/missing/weak points.
7. Manually correct the review.
8. Finish session.
9. See weak topics.
10. Get generated practice items for later review.
11. Close and reopen app without losing progress.

---

## 29. Example first seed content set

Create at least:

### Roles

- Frontend Developer
- Backend Developer
- Fullstack Developer
- Backend Architect
- Solution Architect

### Modes

- Concept Check
- Scenario Discussion
- Trade-off Decision
- Troubleshooting
- System Design

### Minimum topics

Frontend:

- React rendering
- State management
- API integration
- Frontend performance
- Error handling

Backend:

- API design
- Authentication
- SQL vs NoSQL
- Caching
- Queues
- Idempotency
- Observability

Architecture:

- Requirements clarification
- Scalability
- Reliability
- Trade-offs
- Migration
- Security
- Cost

### Minimum questions

At least 5 questions per role per main mode.

Target for MVP seed:

```txt
5 roles × 5 modes × 5 questions = 125 question cards
```

A smaller technical MVP may start with 30–50 well-written cards.

---

## 30. Product summary

Build a local-first, speech-driven technical interview simulator for developer and architect interviews.

The app should not behave like a course. It should behave like an interviewer:

- asks realistic questions,
- listens to spoken answers,
- checks them against role-specific rubrics,
- asks follow-ups,
- tracks weak areas,
- schedules repeated practice.

The core value is not content consumption, but **interview-ready recall, structured communication, and trade-off-based technical reasoning**.
