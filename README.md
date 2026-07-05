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
- **5 interview modes** seeded: concept check, scenario discussion, trade-off
  decision, troubleshooting, system design (20 question cards with full
  rubrics and follow-ups).
- **Voice-first answering**: microphone recording → local Whisper
  transcription in a Web Worker (tiny/base/small model choice, download
  progress, cached). Typing is always available as a fallback.
- **Hybrid review**: deterministic rubric matching (accepted/weak/negative
  signals) + one-tap manual override; weighted scoring by importance × role.
- **Dynamic follow-ups** triggered by what you covered, missed or mentioned.
- **Weak topic tracking + spaced repetition**: missed critical points become
  practice cards; self-scored reviews reschedule them.
- **Unknown topic intake**: add a topic you don't know yet — it gets learning
  cards and stays out of interviews until you're ready.
- **JSON content packs**: drop AI-generated question packs into
  `content/packs/` and they are auto-loaded and validated — see
  [docs/content-authoring.md](docs/content-authoring.md).
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

## Deployment (GitHub Pages)

The app is a fully static export (`output: "export"`) — no server needed.
Pushing to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
tests + content pack validation, then a static build published to GitHub
Pages at `https://<user>.github.io/<repo>/`. The workflow enables Pages
automatically on first run; adding a content pack and pushing redeploys the
site with the new questions.

To preview the exact Pages build locally:

```bash
NEXT_PUBLIC_BASE_PATH=/interview-trainer npm run build   # PowerShell: $env:NEXT_PUBLIC_BASE_PATH="/interview-trainer"; npm run build
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
