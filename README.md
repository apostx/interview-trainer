# Interview Trainer

A local-first, speech-driven **technical interview simulator** for developer
and architect interviews — no coding interview, no course content. The app
behaves like an interviewer: it asks realistic questions, gives you thinking
time, records your spoken answer, transcribes it **locally in the browser**
(Whisper via Transformers.js), scores it against role-specific rubrics, asks
follow-ups, tracks your weak topics and schedules them for spaced repetition.

Full product specification: [docs/spec.md](docs/spec.md).

## Features (MVP)

- **6 roles** (Frontend/Backend/Fullstack Developer, Frontend/Backend/Solution
  Architect) sharing one interview engine — roles are just configuration.
- **Simple flow**: pick role → Quick (10 min) or Standard (30 min) → answer →
  feedback. Three user-facing practice types (Quick Questions, Real Scenarios,
  Architecture Practice) map onto the engine's seven interview modes; the
  knobs live under Advanced settings.
- **20 seeded question cards** across concept check, scenario discussion,
  trade-off decision, troubleshooting and system design, with full rubrics
  and follow-ups.
- **Voice-first answering**: microphone recording → local Whisper
  transcription in a Web Worker (tiny/base/small model choice, download
  progress, cached). Typing is always available as a fallback.
- **Hybrid review**: deterministic rubric matching (accepted/weak/negative
  signals) plus local semantic matching — a small embedding model
  (MiniLM, in-browser) credits paraphrases without accepting nonsense;
  one-tap manual override; weighted scoring by importance × role.
- **Dynamic follow-ups** triggered by what you covered, missed or mentioned.
- **Weak topic tracking + spaced repetition**: missed critical points become
  practice cards; self-scored reviews reschedule them.
- **Unknown topic intake**: add a topic you don't know yet — it gets learning
  cards and stays out of interviews until you're ready.
- **JSON content packs**: drop AI-generated question packs into
  `content/packs/` and they are auto-loaded and validated — see
  [docs/content-authoring.md](docs/content-authoring.md).
- **Study view**: browse every question with what a strong answer covers
  and the likely follow-ups — learning mode without being quizzed.
- **Local-first**: everything persists in IndexedDB. No account, no backend,
  audio never leaves the browser.
- Responsive UI: sidebar on desktop, bottom tab bar on mobile; light and dark.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Zustand · Dexie
(IndexedDB) · @huggingface/transformers (Whisper, WebGPU/WASM) · Vitest.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run test       # unit tests for the core services
npm run content:check  # validate content packs in content/packs/
npm run build      # production build
```

End-to-end browser drive (uses your installed Chrome):

```bash
npm run dev -- --port 3457
node scripts/e2e/drive.mjs   # full MVP flow with screenshots
node scripts/e2e/mic.mjs     # mic → Whisper pipeline with a fake audio device
node scripts/e2e/packs.mjs   # content pack loading + session integration
```

## Versioning & releases

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`, `chore:` (+ optional
scope, e.g. `feat(content): add kubernetes pack`). Versions follow semver.

**Deploys are release-driven**: pushing to `main` only runs CI
([ci.yml](.github/workflows/ci.yml) — lint, tests, build). The site is
published to GitHub Pages when a `v*` tag is pushed
([deploy.yml](.github/workflows/deploy.yml)). Cutting a release:

```bash
npm run release:patch   # 0.1.0 → 0.1.1  (fixes, content packs)
npm run release:minor   # 0.1.0 → 0.2.0  (new features)
npm run release:major   # breaking changes
```

Each command bumps `package.json`, creates a `chore(release): x.y.z` commit
with a `vx.y.z` tag, and pushes with `--follow-tags` — the tag triggers the
Pages deploy.

## Deployment (GitHub Pages)

The app is a fully static export (`output: "export"`) — no server needed.
The release workflow runs tests + content pack validation, then publishes
the static build to GitHub Pages, served on the custom domain
**https://interviewtrainer.sallai.cc/** (root, no basePath). Adding a
content pack and cutting a patch release redeploys the site with the new
questions.

To preview the exact Pages build locally:

```bash
npm run build
node scripts/e2e/pages.mjs   # serves and drives the static out/ build
```

## Project layout

```
src/
  app/          # screens: dashboard, setup, session runner, summary,
                # topics, topic intake, practice, settings
  components/   # shared UI (timers, capture, rubric checklist, …)
  core/
    content/    # pack schema (zod), folder loader, merged bank
    models/     # domain types (spec §9)
    seed/       # topics + question cards with rubrics
    services/   # session generator, rubric matcher, scoring,
                # follow-up selector, spaced repetition (unit-tested)
    speech/     # recorder, Whisper worker
    storage/    # Dexie schema + repositories
  stores/       # Zustand stores (session runner, transcriber)
```
