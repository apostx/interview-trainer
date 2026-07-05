---
name: verify
description: Build, launch and drive the Interview Trainer web app end-to-end to verify changes at the browser surface.
---

# Verifying the Interview Trainer

Local-first Next.js app; everything runs in the browser (IndexedDB via Dexie,
Whisper via Transformers.js in a Web Worker). There is no backend to mock —
the browser is the whole surface.

## Build / launch

```bash
npm run dev -- --port 3457        # dev server (background; don't pipe to head, it kills it)
npm run build                     # production build (Turbopack)
npm run test                      # vitest unit tests for src/core/services
```

If port 3457 is stuck: `Get-NetTCPConnection -LocalPort 3457` → `Stop-Process`.

## Drive (the real verification)

Playwright is a devDependency and uses the installed system Chrome
(`channel: "chrome"`, no browser download needed):

```bash
node scripts/e2e/drive.mjs        # full MVP flow, screenshots into e2e-shots/
node scripts/e2e/mic.mjs          # mic → Whisper path with a fake audio device
node scripts/e2e/packs.mjs        # content packs load + appear in sessions
```

Content packs (`content/packs/*.json`) are validated by `npm run
content:check`; an intentionally broken pack should surface its zod errors on
the /topics page, not crash the app.

`drive.mjs` covers: dashboard empty state → session setup (incl. zero-mode
error probe) → 5-question runner (typed answers, hint, skip, manual rubric
override with score change) → follow-ups → summary → IndexedDB persistence
across reload → practice queue self-scoring → unknown-topic intake → topic
library → settings persistence → 375px mobile check (bottom nav, no
horizontal scroll). Each run gets a fresh browser profile, so IndexedDB
starts empty — no cleanup needed.

`mic.mjs` launches Chrome with `--use-fake-device-for-media-stream`, records
the fake tone, and waits through the real whisper-tiny.en download (~25 s on
first run; cached after). Expect a near-empty transcript like "you" — the
fake device produces a tone, not speech. Reaching the editing textarea with
no page errors is the pass signal.

## Static export (GitHub Pages)

The app deploys as a static export with a basePath. To verify that surface:
build with `NEXT_PUBLIC_BASE_PATH=/interview-trainer` (set the env var in
PowerShell — Git Bash mangles the leading slash), stage `out/` under a
`pages-root/interview-trainer/` folder, serve it with `python -m http.server`,
and run `scripts/e2e/pages.mjs`. `scripts/flatten-rsc-export.mjs` (postbuild)
must keep the RSC payload 404s away — if `__next.*.__PAGE__.txt` 404s
reappear, that flattening broke.

## Gotchas

- Scripts must run from the repo root (playwright resolves from node_modules).
- Question selection is randomized per session; don't assert specific cards.
- The dark circle bottom-left in dev screenshots is the Next.js dev tools
  button, not an app element.
