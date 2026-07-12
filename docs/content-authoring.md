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
5. Optional dress rehearsal: **`npm run release:beta`** publishes your
   CURRENT working state (even uncommitted) to
   <https://interviewtrainer.sallai.cc/beta/> without touching your branch
   or the version number. The sidebar there shows `vX.Y.Z-beta.<sha>` so it
   cannot be mistaken for production.
6. Publish to the live site: **`npm run release:content`** — it re-runs the
   gates, commits everything changed, bumps the minor version and pushes;
   the `v*` tag triggers the Pages deploy (~2 minutes to live). Custom commit
   message: `npm run release:content -- "feat: kubernetes pack"`.
7. Unhappy with what went out? **`npm run release:revert`** rolls the DATA
   back to the previous release (or `-- v0.24.0` for a specific one) and
   ships it as a new patch version — app code stays current, the version
   keeps increasing, only `content/packs/` reverts. Preview with
   `-- v0.24.0 --dry-run`.

Packs need no registration anywhere: every `*.json` in `content/packs/` is
discovered automatically at build time. Note the flip side: the LIVE site
only picks up content after a release — dev mode hot-reloads instantly.

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
                                    // devops | observability | soft_technical | core
  "relatedTopicIds": ["event_driven"], // optional
  "studyNotes": "Educational prose for the Study view. Paragraphs separated by\nblank lines (\\n\\n); lines starting with \"- \" become bullet lists; a line\nstarting with \"## \" becomes a subheading.",  // optional but strongly encouraged
  "i18n": {                             // optional Study-only translations
    "hu": { "name": "…", "studyNotes": "…" }  // any omitted field falls back to English
  }
}
```

### Study translations (`i18n`)

The **Study section only** can be read in other languages; the interview and
practice flow stay English. Add an optional `i18n` block keyed by language
code (`hu`, `de`, `pt-BR`, …) to any topic and/or question card. It is
**per-field with English fallback**: translate as much or as little as you
like — anything you omit shows the English original. English is the base and
is never a key. When at least one translation exists, a language selector
appears in the Study view (and the exported PDF follows the choice).

- **Topic** `i18n[lang]`: `name`, `description`, `studyNotes` (all optional).
- **Question** `i18n[lang]`: `title`, `prompt`, `answerStructureHint`,
  `expectedPoints` (an object keyed by the rubric item's `id` → `{ label,
  description }`), and `followUps` (keyed by the follow-up's `id` → translated
  prompt string). `acceptedSignals` are never translated (the scoring engine
  runs in English).

```jsonc
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

`studyNotes` is what makes the Study section educational: a well-written
explanation of the topic that someone can *learn from*, with the question
cards rendered below it as practice checks.

**Every topic's notes MUST follow this fixed structure**, in simple, plain
English — written for a developer who does NOT yet know the topic (no
insider shorthand, no clever one-liners that only make sense if you already
understand it; jargon is explained the moment it appears):

```
## What is it?
2-4 plain sentences defining the thing.

## What problem does it solve?
Why it exists; what goes wrong without it.

## How it works
The mechanism / main parts / decision logic, with "- " bullets where a
list is clearer than prose. (May be titled contextually, e.g.
"## How it works" plus an extra subsection, but starts here.)

## Common mistakes
- 2-4 bullets: the misunderstandings and weak answers interviewers hear

## Key terms
- term — one-line plain definition
- term — one-line plain definition
```

Aim for 150–400 words per topic.

**Blank lines are required around every `## ` heading** — one blank line
before it AND one blank line after it (including before the first `- ` bullet
underneath). A heading glued to the text above or to the bullets below renders
as literal `## ` text instead of a heading, and `content:check` rejects it.
In JSON this means the `studyNotes` string uses `\n\n` before and after each
`## ` marker, e.g. `"…prose.\n\n## How it works\n\n- first bullet…"`.

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

## Extending the bank with an external AI

The intended workflow for growing or fixing content with *any* AI system
(Claude, ChatGPT, Gemini, …) — no repo access needed on the AI's side:

1. **Give the AI its context.** If the AI can fetch URLs, just link these
   (raw links, always current on `main`):
   - the spec (this file):
     <https://raw.githubusercontent.com/apostx/interview-trainer/main/docs/content-authoring.md>
   - the id inventory (auto-regenerated on every `release:content`):
     <https://raw.githubusercontent.com/apostx/interview-trainer/main/docs/content-inventory.md>
   - if *modifying* a pack, its JSON:
     `https://raw.githubusercontent.com/apostx/interview-trainer/main/content/packs/<name>.json`

   If the AI cannot fetch URLs, paste the same three things instead
   (`npm run content:ids` prints the inventory). Then add your instruction —
   what to add/change, in any language; the OUTPUT must be English.
2. **The AI answers with JSON** — either a brand-new pack or the complete
   updated pack file.
3. **You copy it back** into `content/packs/<name>.json` (overwrite the old
   file when modifying — the AI must always return the *whole* file, never
   a fragment).
4. **Validate: `npm run content:check`.** It enforces the schema, id
   uniqueness, reference integrity, and the studyNotes structure, and names
   the exact file/path/expectation for anything wrong. Nothing invalid can
   reach the app — a broken pack is skipped and reported, never crashes.
5. Reload the app (or `npm run dev`) and review the result in the Study tab.

Rules the AI must follow when **modifying** existing content:

- Never change existing `id` values — user progress (practice history,
  spaced repetition) is keyed to question/topic ids.
- Keep every topic's `studyNotes` in the fixed structure below.
- Prefer linking to an existing topic (`relatedTopicIds`, or reusing its id
  in `topicIds`) over creating a near-duplicate topic.
- Keep `sources` accurate: list the `dataresource/` files (path without
  extension) the content is based on.

To **translate** a pack into another language (for the Study language
selector), use the ready-made prompt in
"[Translating a pack into another language](#translating-a-pack-into-another-language-ai-prompt)"
below — translations are additive `i18n` blocks, so they never touch ids or
the English text.

## AI prompt template

Paste this into the AI chat (together with the `content:ids` output), fill
in the placeholders, and save the output as `content/packs/<name>.json`:

````text
You are generating a content pack for a technical interview trainer app.
Output ONLY a single valid JSON object, no markdown fences, no commentary.

The JSON must follow this exact structure (all ids snake_case):

{
  "id": "<pack id>",
  "name": "<pack name>",
  "description": "<one sentence>",
  "sources": ["<dataresource file the content comes from, e.g. tibi/login>"],
  "topics": [
    { "id": "...", "name": "...", "description": "...",
      "category": "<frontend|backend|fullstack|architecture|cloud|security|database|devops|observability|soft_technical|core>",
      "relatedTopicIds": [],
      "studyNotes": "## What is it?\\n\\n<plain definition>\\n\\n## What problem does it solve?\\n\\n<why it exists>\\n\\n## How it works\\n\\n<mechanism; '- ' lines become bullets>\\n\\n## Common mistakes\\n\\n- <misunderstanding or weak answer>\\n\\n## Key terms\\n\\n- <term> — <one-line definition>" }
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
- Every topic MUST have studyNotes: a 150-400 word plain-English explanation
  written for someone who does NOT yet know the topic. Fixed structure:
  "## What is it?" (plain definition), "## What problem does it solve?",
  "## How it works" (mechanism, bullets welcome), "## Common mistakes"
  (2-4 bullets of misunderstandings/weak answers), "## Key terms"
  ("- term — one-line definition" bullets). Simple sentences; explain jargon
  the moment it appears; no insider one-liners. Paragraphs separated by \n\n.
  The questions are practice checks *under* the notes.
- CRITICAL formatting: put \n\n BEFORE and AFTER every "## " heading (also
  between a heading and the first "- " bullet under it). A heading without a
  blank line on both sides renders as literal "## " text and is rejected by
  content:check. Example: "…prose.\n\n## How it works\n\n- first bullet".
- Every question needs 1-2 followUps that probe the most likely gap.
- Mix the modes: concept_check for definitions, tradeoff_decision for X-vs-Y,
  scenario_discussion / troubleshooting for practical situations,
  system_design for design tasks.
- Write everything in English.
- Do NOT reuse or change any id from the inventory I pasted; new ids must not
  collide with it. Where a concept already exists as a topic in the inventory,
  reference it via relatedTopicIds instead of creating a duplicate topic.
- ONE topic = ONE concept. Never bundle several distinct concepts into a
  combined topic ("X, Y & Z"); make separate topics linked by relatedTopicIds.
  Comparisons ("X vs Y") count as one concept.
- If I asked you to MODIFY an existing pack (its JSON is pasted below),
  return the COMPLETE updated pack file — never a fragment or a diff — and
  keep all existing ids unchanged.

Generate a pack now for these topics, with 3 questions per topic:

TOPICS: <<< YOUR TOPIC LIST HERE, e.g. "Kubernetes basics, Service Mesh, OAuth2 flows" >>>
TARGET ROLES: <<< e.g. "backend_developer and backend_architect" >>>
SOURCES: <<< dataresource file(s) this is based on, e.g. "tibi/system_design" — or omit if none >>>
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
  { "name": "...", "description": "...", "studyNotes": "..." }. Translate the
  studyNotes fully, KEEPING the exact section structure and blank lines:
  each "## " heading stays on its own line with a blank line before it (only
  the heading text is translated, e.g. "## What is it?" -> "## Mi ez?").
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
