# Content authoring — extending the question bank with JSON packs

The app's content lives in two places:

1. **Built-in seed content** in `src/core/seed/` (compiled in).
2. **Content packs**: plain JSON files in **`content/packs/`**. Every
   `*.json` file dropped into that folder is picked up automatically at
   build/dev time — no registration, no database import. In dev mode the
   running app hot-reloads when you add or edit a file.

Invalid packs never break the app: they are skipped and the exact validation
errors are shown on the **Topics** page (and in `npm run content:check`).

## Workflow

1. Write or AI-generate a pack JSON (prompt template below).
2. Save it as `content/packs/<your-pack>.json`.
3. Validate: `npm run content:check` — fix anything it reports.
4. Reload the app. The Topics page lists the pack; its topics appear in the
   library and its questions join the session generator's pool.

## Pack structure

```jsonc
{
  "id": "my_pack",                  // snake_case, unique across packs
  "name": "Human readable name",
  "description": "optional",
  "sources": ["tibi/lufthansa"],    // origin files in dataresource/ (no extension);
                                    // drives the Study source filter. A question can
                                    // override with its own "sources" array.
  "topics": [ /* new topics this pack introduces (optional) */ ],
  "questions": [ /* question cards (optional) */ ]
}
```

### Topic

```jsonc
{
  "id": "event_sourcing",           // snake_case, unique across app + packs
  "name": "Event Sourcing",
  "description": "Storing state as an append-only sequence of events.",
  "category": "architecture",       // one of: frontend | backend | fullstack |
                                    // architecture | cloud | security | database |
                                    // devops | observability | soft_technical
  "relatedTopicIds": ["event_driven"], // optional
  "studyNotes": "Educational prose for the Study view. Paragraphs separated by\nblank lines (\\n\\n); lines starting with \"- \" become bullet lists; a line\nstarting with \"## \" becomes a subheading."  // optional but strongly encouraged
}
```

`studyNotes` is what makes the Study section educational: a well-written
explanation of the topic that someone can *learn from*, with the question
cards rendered below it as practice checks. Aim for 150–400 words per topic —
explain the concept, the why, the trade-offs, and the classic mistakes, in
the same order a good tutorial would.

Questions may also reference **existing seed topic ids** (see
`src/core/seed/topics.ts`), e.g. `api_design`, `caching`, `message_queue`,
`idempotency`, `observability`, `scalability`, `microservices`, …

### Question card

```jsonc
{
  "id": "event_sourcing_concept_001",   // snake_case, unique
  "title": "Event Sourcing basics",
  "prompt": "What is Event Sourcing and what problem does it solve?",
  "roles": ["backend_developer", "backend_architect"],
  // roles: frontend_developer | backend_developer | fullstack_developer |
  //        frontend_architect | backend_architect | solution_architect
  "modes": ["concept_check"],
  // modes: concept_check | experience_deep_dive | scenario_discussion |
  //        tradeoff_decision | system_design | design_review | troubleshooting
  "topicIds": ["event_sourcing"],
  "expectedDurationSeconds": 180,       // optional, default 180
  "thinkingTimeSeconds": 45,            // optional, default 45
  "answerStructureHint": "Definition, use case, trade-off.",  // optional
  "expectedPoints": [ /* 2–5 rubric items, at least 1 required */ ],
  "followUps": [ /* optional */ ],
  "sampleStrongAnswer": "optional"
}
```

### Rubric item (`expectedPoints[]`)

This is what the answer is scored against. Signals are matched
case-insensitively, on word boundaries, punctuation-insensitively.

```jsonc
{
  "id": "es_definition",
  "label": "Defines event sourcing",
  "description": "Explains that state is derived from an append-only event log.",
  "importance": "critical",            // critical | important | nice_to_have
  "roleWeight": { "backend_developer": 5, "backend_architect": 5 },  // 1–5 per role
  "acceptedSignals": [                 // strong phrases → "covered"
    "append only", "event log", "replay events", "state from events"
  ],
  "weakSignals": ["history of changes"],      // optional → "weak"
  "negativeSignals": ["just an audit log"]    // optional → downgrades to "weak"
}
```

Guidelines for good signals:
- 4–8 accepted signals per item; short phrases (1–4 words) the candidate would
  realistically say out loud.
- Include synonyms and paraphrases ("safe retry", "no duplicate side effect"),
  not just the jargon term.
- Scoring: covered = full weight, weak = half, missing = zero;
  weight = importance (critical 3 / important 2 / nice_to_have 1) × roleWeight.

### Follow-up (`followUps[]`)

```jsonc
{
  "id": "es_replay_followup",
  "trigger": { "type": "rubric_missing", "rubricItemId": "es_definition" },
  // triggers: {"type":"always"}
  //           {"type":"rubric_missing","rubricItemId":"..."}   // probes a gap
  //           {"type":"rubric_covered","rubricItemId":"..."}   // digs deeper
  //           {"type":"topic_mentioned","topicId":"..."}
  "prompt": "How would you rebuild the current state after a bug in a projection?",
  "expectedPoints": []                 // optional rubric for the follow-up
}
```

`rubricItemId` must reference an item in the same question's `expectedPoints`.

A complete working example: [`content/packs/js-ts-fundamentals-lufthansa.json`](../content/packs/js-ts-fundamentals-lufthansa.json).

## AI prompt template

Paste this into Claude/ChatGPT, fill in the two placeholders, and save the
output as `content/packs/<name>.json`:

````text
You are generating a content pack for a technical interview trainer app.
Output ONLY a single valid JSON object, no markdown fences, no commentary.

The JSON must follow this exact structure (all ids snake_case):

{
  "id": "<pack id>",
  "name": "<pack name>",
  "topics": [
    { "id": "...", "name": "...", "description": "...",
      "category": "<frontend|backend|fullstack|architecture|cloud|security|database|devops|observability|soft_technical>",
      "relatedTopicIds": [],
      "studyNotes": "<a 150-400 word tutorial-style explanation of the topic: the concept, why it matters, trade-offs, classic mistakes. Paragraphs separated by \\n\\n; lines starting with '- ' become bullets; '## ' starts a subheading>" }
  ],
  "questions": [
    {
      "id": "...", "title": "...", "prompt": "...",
      "roles": ["<frontend_developer|backend_developer|fullstack_developer|frontend_architect|backend_architect|solution_architect>"],
      "modes": ["<concept_check|scenario_discussion|tradeoff_decision|system_design|troubleshooting|experience_deep_dive|design_review>"],
      "topicIds": ["<topic id defined above>"],
      "expectedDurationSeconds": 180,
      "thinkingTimeSeconds": 45,
      "answerStructureHint": "...",
      "expectedPoints": [
        {
          "id": "...", "label": "...", "description": "...",
          "importance": "<critical|important|nice_to_have>",
          "roleWeight": { "<role>": <1-5> },
          "acceptedSignals": ["...", "..."],
          "weakSignals": ["..."],
          "negativeSignals": ["..."]
        }
      ],
      "followUps": [
        { "id": "...", "trigger": { "type": "always" }, "prompt": "...", "expectedPoints": [] }
      ]
    }
  ]
}

Content rules:
- Questions are for spoken answers in an interview (no coding tasks).
- 2 to 4 expectedPoints per question; exactly the things a strong candidate
  would say. Mark at most 2 as "critical".
- acceptedSignals: 4-8 short phrases (1-4 words) a candidate would plausibly
  SAY out loud, including synonyms and paraphrases of the concept — not only
  the jargon term. All lowercase.
- Every topic MUST have studyNotes: a 150-400 word tutorial-style explanation
  the learner reads in the Study view (concept, why it matters, trade-offs,
  classic mistakes). Paragraphs separated by \n\n; "- " lines become bullets;
  "## " starts a subheading. The questions are practice checks *under* the notes.
- Every question needs 1-2 followUps that probe the most likely gap.
- Mix the modes: concept_check for definitions, tradeoff_decision for X-vs-Y,
  scenario_discussion / troubleshooting for practical situations,
  system_design for design tasks.
- Write everything in English.

Generate a pack now for these topics, with 3 questions per topic:

TOPICS: <<< YOUR TOPIC LIST HERE, e.g. "Kubernetes basics, Service Mesh, OAuth2 flows" >>>
TARGET ROLES: <<< e.g. "backend_developer and backend_architect" >>>
````

After saving, always run `npm run content:check` — if the AI hallucinated a
field or an invalid enum value, the test names the file, the exact path and
what was expected.
