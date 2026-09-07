# Practice Companion

A private, offline-capable practice desk for piano and keyboard: choose a
routine, run a focused session with a timer and metronome, record what
happened, and review the week.

Everything runs in the browser. There is no account, no server, and no
analytics; practice data stays in the device's IndexedDB and leaves it only
when the learner exports a file.

- Production origin (planned): https://practice.bwinkeler.com
- Interface languages: Brazilian Portuguese (default) and English
- Product concept: `docs/PRACTICE-COMPANION-PROPOSAL.md`

## What it does

- **Activities** — reusable practice blocks with area, instructions, course or
  book reference, an optional `https` link, and a target tempo.
- **Routines** — ordered activity steps with planned minutes and an optional
  per-step tempo; reordering never requires drag and drop.
- **Sessions** — a focused runner with a wall-clock timer, pause and resume,
  step navigation, per-activity notes and tempo, and draft recovery.
- **Metronome** — Web Audio look-ahead scheduling, 30–300 BPM, 2/4, 3/4, 4/4
  and 6/8, tap tempo, accented downbeat, and a non-colour-only visual pulse.
- **Chord dictionary** — every root and thirty-seven qualities, spelled by
  interval, drawn as searched guitar shapes with fingering and as keyboard
  voicings with inversions; reachable during a session and convertible into a
  practice activity in one click.
- **History and progress** — editable session history, weekly minutes and
  practice days, distribution per practice area, recent activities, and tempo
  evidence, each chart backed by a data table.
- **Backup** — a full-fidelity JSON export that restores atomically, plus a CSV
  export for spreadsheets with formula characters neutralised.

## Getting started

```bash
npm ci
npm run dev
```

| Command            | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `npm run dev`      | Vite dev server                                                      |
| `npm run build`    | Production build into `dist`                                         |
| `npm run preview`  | Serves `dist` on http://127.0.0.1:4327                               |
| `npm run validate` | Format, lint, both type projects, unit tests, build, artefact policy |
| `npm run test:e2e` | Playwright suite, including axe accessibility checks                 |
| `npm run icons`    | Regenerates the PWA icons from code                                  |

## Documentation

- `docs/ARCHITECTURE.md` — structure, data model, and boundaries
- `docs/REQUIREMENTS.md` — the requirement baseline and its verification
- `docs/SERVICE_MANIFEST.md` — the operational contract
- `docs/OPERATIONS.md` — deploy, verify, roll back, and recover
- `docs/ADR/` — the decisions that are expensive to reverse

## Honest limits

- Browser storage can still be cleared by the browser, the operating system, or
  the user. Installing the app and exporting JSON backups is the recovery path.
- The metronome is guaranteed only while the app is visible in the foreground.
- The elapsed timer counts practised time up to the last save; a session that
  is interrupted resumes paused instead of inventing time.

## Licence

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
