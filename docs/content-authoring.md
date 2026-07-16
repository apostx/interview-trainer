# Content authoring — extending the question bank with JSON packs

The app's content lives in two places:

1. **Built-in seed content** in `src/core/seed/` (compiled in).
2. **Data packs**: folders under **`content/packs/`**, each holding one or
   more JSON files. Every pack folder is picked up automatically at build/dev
   time — no registration, no database import. In dev mode the running app
   hot-reloads when you add or edit a file.

Invalid packs never break the app: they are skipped and the exact validation
errors are shown on the **Topics** page (and in `npm run content:check`).

## Workflow

1. Write or AI-generate the pack JSON file(s) (prompt template below).
2. Save them under `content/packs/<pack-name>/` (one folder per pack; a pack
   may span several JSON files).
3. Validate: `npm run content:check` — fix anything it reports.
4. Reload the app. The Topics page lists the pack; select it in the
   Study/Practice/Setup "Pack" dropdown to study or practice exactly that
   pack (nothing selected = all packs).
5. Publish to the live site: **`npm run release:content`** — it re-runs the
   gates, commits everything changed, bumps the minor version and pushes;
   the `v*` tag triggers the Pages deploy (~2 minutes to live). Custom commit
   message: `npm run release:content -- "feat: kubernetes pack"`.
6. Unhappy with what went out? **`npm run release:revert`** rolls the DATA
   back to the previous release (or `-- v0.24.0` for a specific one) and
   ships it as a new patch version — app code stays current, the version
   keeps increasing, only `content/packs/` reverts. Preview with
   `-- v0.24.0 --dry-run`.

Packs need no registration anywhere: every pack folder in `content/packs/`
is discovered automatically at build time. Note the flip side: the LIVE site
only picks up content after a release — dev mode hot-reloads instantly.

## Pack structure

**A data pack is a first-level FOLDER under `content/packs/`** (e.g.
`content/packs/luxair/`) and may contain several JSON files — all of them
together form one independent bank. Packs are fully independent of each
other: ids only need to be unique WITHIN a pack, different packs may reuse
ids freely, and a pack's questions may only reference topics defined in the
same pack (or bare seed-taxonomy ids). The app's Study/Practice/interview
flows work from the packs selected in the UI (one or several; nothing
selected = all packs); overlaps between packs are deliberately not managed.

```jsonc
{
  "id": "my_pack",                  // snake_case, unique within the pack folder
  "name": "Human readable name",
  "description": "optional",
  "topics": [ /* new topics this pack introduces (optional) */ ],
  "questions": [ /* question cards (optional) */ ]
}
```

### Topic

```jsonc
{
  "id": "event_sourcing",           // snake_case, unique within this pack
  "name": "Event Sourcing",
  "description": "Storing state as an append-only sequence of events.",
  "category": "architecture",       // one of: frontend | backend | fullstack |
                                    // architecture | cloud | security | database |
                                    // devops | observability | soft_technical | core
  "relatedTopicIds": ["event_driven"], // optional
  "studyContent": {                    // REQUIRED: the structured study material
    "mentalModel": "1-2 plain sentences with the central idea (max 300 chars).",
    "problem": "What goes wrong without the concept (max 600 chars).",
    "example": "One concrete, easy-to-follow example (max 700 chars).",
    "howItWorks": ["2-5 simple steps.", "Each step max 220 chars."],
    "commonMistakes": ["2-4 misunderstandings.", "Each max 220 chars."],
    "keyTerms": [{ "term": "max 60 chars", "definition": "max 220 chars" }]
  },
  "importance": 4,                      // optional, 1–5: how essential for interviews
                                        // (5 = asked in almost every relevant interview,
                                        //  3 = commonly comes up, 1 = niche/rare).
                                        // Drives the Study "Importance" filter so the
                                        // learner can start with the essentials.
  "i18n": {                             // optional Study-only translations
    "hu": { "name": "…", "studyContent": { "mentalModel": "…" } }  // any omitted field falls back to English
  }
}
```

**Write every prose field for a learner, not for a database.** This is the
most common failure mode when a whole bank is generated in one JSON pass: the
model slips into telegram style ("Failing fast when a dependency repeatedly
fails.") because it is filling short fields at scale, and the result reads
like reference metadata instead of teaching. Rules:

- `description`: one or two FULL sentences that teach the concept to someone
  who has never heard of it — subject, verb, plain words. Bad: "Coordination
  of the call stack, tasks, and rendering." Good: "The event loop is how
  JavaScript juggles many pending tasks on a single thread: it runs one piece
  of work at a time and decides what runs next."
- The same applies to rubric `label`/`description` and follow-up prompts —
  every string a learner sees must survive being read out of context.
- Write the studyContent fields and descriptions as clear teaching prose
  before wrapping them in JSON. Do not let the JSON format shorten your
  sentences.
- Generate in small batches (a handful of topics per request) so each topic
  gets real writing effort instead of a token-budget ration.

`importance` is optional for backward compatibility. When at least one topic
has it, an "Importance" filter appears in Study and Practice — a multi-select
of levels 5…1 plus "Unrated"; topics WITHOUT a rating only show when nothing
(or "Unrated") is selected. Rate honestly and
relative to the whole bank — if everything is a 5, the filter is useless.
Rough guide: 5 = a first-round staple (HTTP basics, Big-O, core language
features); 4 = expected from the target role; 3 = commonly asked; 2 =
occasional; 1 = niche/specialist.

### Study translations (`i18n`)

The **Study section only** can be read in other languages; the interview and
practice flow stay English. Add an optional `i18n` block keyed by language
code (`hu`, `de`, `pt-BR`, …) to any topic and/or question card. It is
**per-field with English fallback**: translate as much or as little as you
like — anything you omit shows the English original. English is the base and
is never a key. When at least one translation exists, a language selector
appears in the Study view (and the exported PDF follows the choice).

- **Topic** `i18n[lang]`: `name`, `description`, `studyContent` — all
  optional. Inside a translated `studyContent`, scalar
  fields fall back to English per field; a provided ARRAY replaces the
  complete English array (arrays are never merged by index — translate a
  list fully or leave it out entirely). Section headings are localized by
  the app, so translations contain no headings.
- **Question** `i18n[lang]`: `title`, `prompt`, `answerStructureHint`,
  `expectedPoints` (an object keyed by the rubric item's `id` → `{ label,
  description }`), and `followUps` (keyed by the follow-up's `id` → translated
  prompt string). `acceptedSignals` are never translated (the scoring engine
  runs in English).

```jsonc
// on a topic:
"i18n": {
  "hu": {
    "name": "…", "description": "…",
    "studyContent": {
      "mentalModel": "…", "problem": "…", "example": "…",
      "howItWorks": ["…", "…"],          // replaces the whole English array
      "commonMistakes": ["…", "…"],
      "keyTerms": [{ "term": "…", "definition": "…" }]
    }
  }
}

// on a question card:
"i18n": {
  "hu": {
    "title": "…", "prompt": "…",
    "expectedPoints": { "es_definition": { "label": "…", "description": "…" } },
    "followUps": { "es_replay_followup": "…" }
  }
}
```

**One topic = one concept.** A topic must cover exactly the concept its name
promises. Comparisons ("SQL vs NoSQL") and single mechanisms with several
parts ("Caching & Invalidation") are one concept; grab-bags like
"Indexes, Transactions & Pools" are not — split those into separate topics
and connect them with `relatedTopicIds`. Notes may reference neighboring
topics, but must not explain them.

### Study content (`studyContent`) — the educational core

`studyContent` is what makes the Study section educational: the structured
material a learner reads, with the question cards rendered below it as
practice checks.

**PEDAGOGICAL SIMPLICITY IS MORE IMPORTANT THAN COMPLETENESS.** The Study
page exists to create a clear FIRST mental model, not to document every
production mechanism, metric, protocol, edge case, or implementation
variation. Interview-specific depth already belongs in the question cards,
expectedPoints, followUps, and related topics.

Section headings are rendered by the app (localized to the reading
language); never write "## " headings inside the fields. Deterministic
limits, enforced by `npm run content:check`:

| field            | shape                | hard-validated limits                              |
| ---------------- | -------------------- | -------------------------------------------------- |
| `mentalModel`    | string               | required; ONE paragraph; ≤300 chars                |
| `problem`        | string               | required; ≤600 chars                               |
| `example`        | string               | required; ≤700 chars                               |
| `howItWorks`     | string[]             | 2–5 steps, each ≤220 chars                         |
| `commonMistakes` | string[]             | 2–4 items, each ≤220 chars                         |
| `keyTerms`       | {term, definition}[] | 1–5 items; term ≤60, definition ≤220               |

Everything in the table (plus the ban on "## " headings inside fields) is
hard-validated by the schema. Two rules are softer on purpose:

- "mentalModel is 1–2 sentences" is an authoring rule (sentence counting is
  not implemented — only the single-paragraph and length limits are hard).
- The whole English `studyContent` should stay around **100–260 words**;
  above 260 `content:check` prints a warning, not an error — treat it as a
  sign the page stopped being a first explanation.
- `example` is **mandatory**: always include it (`content:check` warns when
  it is missing).

Writing rules:

- The `mentalModel` must be understandable without any prior topic-specific
  knowledge. Start with "X means…" or "X happens when…" where natural.
- Use ONE concrete example, not several unrelated ones.
- Introduce only the technical terms needed to understand the central idea,
  and explain every one of them in plain language. Never explain an
  unfamiliar term with another unfamiliar term.
- One idea per sentence; prefer short sentences.
- Keep `howItWorks` to 2–5 simple steps; no implementation details that
  belong in another topic; no information repeated across sections.
- `keyTerms` may contain only terms necessary for understanding THIS page.
- Question cards provide interview depth; `studyContent` provides initial
  understanding.

Example — a simple topic:

```jsonc
"studyContent": {
  "mentalModel": "Idempotency means an operation can run twice with the same effect as running it once.",
  "problem": "Networks retry: a payment request may be sent again after a timeout even though the first attempt succeeded. Without idempotency, retries create duplicates — double charges, double emails.",
  "example": "A client sends POST /payments with an Idempotency-Key header. The server stores the key with the result; when the same key arrives again, it returns the stored result instead of charging twice.",
  "howItWorks": [
    "The client attaches a unique key to the operation.",
    "The server remembers which keys it has already processed.",
    "A repeated key returns the first result instead of running again."
  ],
  "commonMistakes": [
    "Assuming a retried request is harmless because it usually works.",
    "Generating a new key on every retry, which defeats the purpose."
  ],
  "keyTerms": [
    { "term": "idempotency key", "definition": "a client-provided unique id that lets the server detect a repeated request" }
  ]
}
```

Example — a potentially complex topic (Backpressure), kept at
first-understanding level:

```jsonc
"studyContent": {
  "mentalModel": "Backpressure means that a busy part of the system tells the sender to slow down. It is used when work arrives faster than the system can safely process it.",
  "problem": "Imagine that an API can handle 100 requests per second but receives 500. If it accepts everything, waiting work keeps growing, responses become slower, and the service may eventually fail.",
  "example": "A message consumer reads from a queue at its own pace. When the queue is full, producers get an error and retry later, instead of the consumer drowning in unread messages.",
  "howItWorks": [
    "The receiver signals how much work it can accept right now.",
    "The sender slows down, waits, or gets a rejection.",
    "Work that cannot be accepted fails fast instead of piling up invisibly."
  ],
  "commonMistakes": [
    "Calling any rate limit backpressure — backpressure is a signal from the receiver back to the sender.",
    "Using an unbounded queue as the overload strategy: it hides the problem until memory runs out."
  ],
  "keyTerms": [
    { "term": "bounded queue", "definition": "a queue with a maximum capacity, so overload becomes visible instead of hidden" }
  ]
}
```

Note what the Backpressure example does NOT mention: demand windows,
credits, consumer lag, bounded concurrency, backoff, jitter, intake control,
flow-control protocols. Terms like these enter only when a topic genuinely
requires them or a deeper related topic covers them.


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
  "sampleStrongAnswer": "optional",
  "flashcard": {                        // optional but recommended: powers the
    "shortAnswer": "…",                 //   two-page flashcard PDF back side.
    "commonMistake": "…"                //   Both fields optional; see below.
  }
}
```

`flashcard` feeds the printable flashcard deck (question on the front page,
answer on the back page):

- `shortAnswer`: a concise 1–3 sentence model answer that sounds natural
  when SPOKEN in an interview — a coherent reply, never a concatenation of
  the expectedPoints (max 450 chars). Without it, the back side falls back
  to a short `sampleStrongAnswer` or shows only the key points.
- `commonMistake`: the most common incomplete or incorrect answer to THIS
  question, one sentence (max 300 chars). Without it, the primary topic's
  first `commonMistakes` entry is used.
- Both are translatable via the card's `i18n[lang].flashcard`.

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

## Extending the bank with an external AI

The intended workflow for growing or fixing content with *any* AI system
(Claude, ChatGPT, Gemini, …) — no repo access needed on the AI's side:

1. **Give the AI its context.** If the AI can fetch URLs, just link these
   (raw links, always current on `main`):
   - the spec (this file):
     <https://raw.githubusercontent.com/apostx/interview-trainer/main/docs/content-authoring.md>
   - the id inventory (auto-regenerated on every `release:content`):
     <https://raw.githubusercontent.com/apostx/interview-trainer/main/docs/content-inventory.md>
   - if *modifying* a pack, its JSON file(s):
     `https://raw.githubusercontent.com/apostx/interview-trainer/main/content/packs/<pack-folder>/<file>.json`

   If the AI cannot fetch URLs, paste the same three things instead
   (`npm run content:ids` prints the inventory). Then add your instruction —
   what to add/change, in any language; the OUTPUT must be English.
2. **The AI answers with JSON** — either a brand-new pack or the complete
   updated pack file.
3. **You copy it back** into `content/packs/<pack-folder>/` (overwrite the
   old file when modifying — the AI must always return the *whole* file,
   never a fragment).
4. **Validate: `npm run content:check`.** It enforces the schema, id
   uniqueness, reference integrity, and the structured studyContent limits,
   and names the exact file/path/expectation for anything wrong. Nothing invalid can
   reach the app — a broken pack is skipped and reported, never crashes.
5. Reload the app (or `npm run dev`) and review the result in the Study tab.

Rules the AI must follow when **modifying** existing content:

- Never change existing `id` values — user progress (practice history,
  spaced repetition) is keyed to question/topic ids.
- All educational content lives in `studyContent`.
- Within the SAME pack, prefer linking to an existing topic
  (`relatedTopicIds`, or reusing its id in `topicIds`) over creating a
  near-duplicate. Other packs are irrelevant: never reference their topics
  and never thin this pack because they cover something similar.

To **translate** a pack into another language (for the Study language
selector), use the ready-made prompt in
"[Translating a pack into another language](#translating-a-pack-into-another-language-ai-prompt)"
below — translations are additive `i18n` blocks, so they never touch ids or
the English text.

## Selecting and comparing data packs

- Every data pack is selectable in the **Pack** dropdown on the Study,
  Practice and Setup pages (multi-select; the selection is shared between
  pages, mirrored in the URL as `?pack=a,b` and persisted).
- Nothing selected = every pack. The interview/practice session draws its
  questions from the selected packs only.
- To compare candidate rebuilds of the same pack, drop them in as separate
  pack folders (e.g. `luxair-v2/`) and switch between them in the dropdown;
  delete the loser afterwards.
- Non-pack JSON files (an AI's audit summary, a manifest — anything without a
  top-level `id`) are ignored by both the loader and the gate, so you can drop
  them next to the pack files without breaking anything.


## AI prompt template

Paste this into the AI chat (together with the relevant pack's `content:ids`
section, when extending an existing pack), fill in the placeholders, and save
the output under `content/packs/<pack-folder>/`.
**Batch small:** give the AI at most ~6 topics per request and merge the
results yourself — long topic lists make models ration their writing effort
per topic, which is exactly what produces flat, hard-to-read content:

````text
You are generating a content pack for a technical interview trainer app.
Output ONLY a single valid JSON object, no markdown fences, no commentary.

The JSON must follow this exact structure (all ids snake_case):

{
  "id": "<pack id>",
  "name": "<pack name>",
  "description": "<one sentence>",
  "topics": [
    { "id": "...", "name": "...", "description": "...",
      "category": "<frontend|backend|fullstack|architecture|cloud|security|database|devops|observability|soft_technical|core>",
      "relatedTopicIds": [],
      "studyContent": {
        "mentalModel": "<1-2 plain sentences with the central idea; max 300 chars>",
        "problem": "<what goes wrong without it; max 600 chars>",
        "example": "<ONE concrete, easy-to-follow example; max 700 chars>",
        "howItWorks": ["<2-5 simple steps, each max 220 chars>"],
        "commonMistakes": ["<2-4 misunderstandings, each max 220 chars>"],
        "keyTerms": [{ "term": "<max 60 chars>", "definition": "<plain, max 220 chars>" }]
      },
      "importance": <1-5: how essential for interviews; 5 = asked almost always, 3 = common, 1 = niche> }
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
      ],
      "flashcard": {
        "shortAnswer": "<1-3 natural spoken sentences answering the question; a coherent reply, NOT the expectedPoints glued together; max 450 chars>",
        "commonMistake": "<the most common incomplete/incorrect answer to this question, one sentence; max 300 chars>"
      }
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
- Every topic MUST have studyContent. PEDAGOGICAL SIMPLICITY IS MORE
  IMPORTANT THAN COMPLETENESS: the Study page creates a clear FIRST mental
  model; interview depth belongs in the question cards and follow-ups.
  Target 100-260 words total per topic.
- studyContent rules:
  - mentalModel: understandable with NO prior topic knowledge; start with
    "X means…" or "X happens when…" where natural; 1-2 sentences, one
    paragraph, max 300 chars.
  - problem: what goes wrong without the concept, concretely; max 600 chars.
  - example: exactly ONE concrete, easy-to-follow example in plain prose;
    max 700 chars.
  - howItWorks: 2-5 simple steps, each max 220 chars.
  - commonMistakes: 2-4 items, each max 220 chars.
  - keyTerms: 1-5 items; ONLY the terms needed to understand this page;
    term max 60 chars, definition max 220 chars, plain language.
  - NO "## " headings inside any field (the app renders localized headings).
  - Introduce only the technical terms needed for the central idea; explain
    each in plain words; never explain an unfamiliar term with another
    unfamiliar term; one idea per sentence; nothing repeated across sections.
- Before returning the JSON, do a SIMPLIFICATION PASS over every topic:
  - remove details not needed for first understanding;
  - replace abstract phrases with concrete wording;
  - split any sentence carrying more than one new idea;
  - check that a junior developer could explain the concept after one
    reading;
  - rewrite any sentence that depends on a concept you did not explain.
- Every question needs 1-2 followUps that probe the most likely gap.
- Every question includes "flashcard": shortAnswer must read as something a
  candidate would actually SAY aloud (1-3 sentences, coherent, plain);
  commonMistake names the typical wrong or incomplete answer. Do not repeat
  the expectedPoints verbatim in either field.
- Mix the modes: concept_check for definitions, tradeoff_decision for X-vs-Y,
  scenario_discussion / troubleshooting for practical situations,
  system_design for design tasks.
- Write everything in English.
- The pack you generate is INDEPENDENT: ids only need to be unique within
  this pack, and every question must reference topics defined in THIS pack
  (or bare seed-taxonomy ids). If I pasted an existing pack's inventory to
  extend, do not reuse or change its ids for NEW entries. NEVER skip or thin
  a topic because another pack covers a similar concept — every pack must be
  a complete, self-contained bank for its own scope. The "seed topic ids"
  list is bare taxonomy with NO educational content: you may reference those
  ids in relatedTopicIds, or define a topic with the same id to give it full
  content, but their existence is never a reason to leave a concept out.
- Rate every topic's "importance" (1-5) by how often it comes up in real
  interviews for the target roles: 5 = a first-round staple asked almost
  always, 4 = expected from the role, 3 = commonly asked, 2 = occasional,
  1 = niche. Spread the ratings honestly across the scale — if everything
  is a 5 the learner cannot prioritize.
- ONE topic = ONE concept. Never bundle several distinct concepts into a
  combined topic ("X, Y & Z"); make separate topics linked by relatedTopicIds.
  Comparisons ("X vs Y") count as one concept.
- If I asked you to MODIFY an existing pack (its JSON is pasted below),
  return the COMPLETE updated pack file — never a fragment or a diff — and
  keep all existing ids unchanged.

This prompt is intended for a maximum of approximately six topics per
generation batch. The caller is responsible for splitting larger work into
multiple requests.

Generate a pack now for these topics, with 3 questions per topic:

TOPICS: <<< YOUR TOPIC LIST HERE, e.g. "Kubernetes basics, Service Mesh, OAuth2 flows" >>>
TARGET ROLES: <<< e.g. "backend_developer and backend_architect" >>>
````

After saving, always run `npm run content:check` — if the AI hallucinated a
field or an invalid enum value, the test names the file, the exact path and
what was expected.

## Translating a pack into another language (AI prompt)

Translations power the Study language selector (see "Study translations"
above). To translate an existing pack, paste its JSON plus this prompt. The
AI adds `i18n` blocks; it never touches ids or the English text, so English
stays the base and the translation is pure addition.

````text
You are translating a content pack for a technical interview trainer app into
<<< TARGET LANGUAGE, e.g. Hungarian (code "hu") >>>.

Output ONLY the complete updated pack as a single valid JSON object — the same
file with translations added, no markdown fences, no commentary.

Rules:
- Do NOT change any id, any English text, or any structural field. Translation
  is purely additive.
- For each TOPIC, add an "i18n" object keyed by the language code, e.g. "hu":
  { "name": "...", "description": "...", "studyContent": { ... } }. Translate
  every studyContent field; arrays (howItWorks, commonMistakes, keyTerms)
  must be translated COMPLETELY or omitted entirely — a provided array
  replaces the whole English array. Do NOT put section headings into the
  fields (the app renders localized headings). English technical terms stay
  in English where developers use them untranslated.
- For each QUESTION, add an "i18n" object keyed by the language code with any
  of: "title", "prompt", "answerStructureHint",
  "expectedPoints" (an object keyed by each rubric item's id ->
  { "label": "...", "description": "..." }),
  "followUps" (keyed by each follow-up's id -> translated prompt string).
- NEVER translate "acceptedSignals", "weakSignals" or "negativeSignals" — the
  scoring engine runs in English.
- Every field is optional: translate as much as you can; anything omitted
  falls back to English automatically.
- The language code must look like "hu", "de", or "pt-BR".

Here is the pack to translate:

<<< PASTE THE PACK JSON HERE >>>
````

Then save over the same file and run `npm run content:check`. The language
selector appears in Study automatically once a translation is live (ship with
`npm run release:content`).
