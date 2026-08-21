# Agent instructions

Read these files before changing this repository:

1. `docs/ARCHITECTURE.md`
2. `docs/REQUIREMENTS.md`
3. `docs/SERVICE_MANIFEST.md`
4. `docs/OPERATIONS.md`
5. the ADRs in `docs/ADR/`

## Language

Code, comments, documentation, metadata, commits, and domains are written in
English. The user interface is bilingual: every visible string lives in
`src/i18n/pt-BR.ts` and `src/i18n/en.ts`, Brazilian Portuguese is the default,
and both catalogues must be updated together (ADR 003). `tests/i18n.test.ts`
fails when a key, a placeholder, or a translation is missing.

## Architecture

- Keep the output fully static and local-first. Do not add a backend, database
  server, account system, Pages Function, or VPS dependency without an approved
  ADR; that boundary is the product, not an optimisation (ADR 001).
- Keep every asset local. No fonts, images, sounds, analytics, or scripts may be
  loaded from a third-party origin. `scripts/check-artifacts.mjs` enforces this.
- Keep domain logic out of components: timing in `src/session/timing.ts`, beat
  maths in `src/audio/scheduler.ts`, aggregation in `src/stats/aggregate.ts`,
  persistence in `src/data/`. Those modules must stay free of React and of the
  DOM so they remain unit-testable.
- Treat an imported backup as untrusted input. It is validated field by field in
  `src/data/backup.ts` before a single record is written, and restore replaces
  the database in one transaction (ADR 004).
- Render user text as text. No `dangerouslySetInnerHTML`, no Markdown renderer,
  and only `https:` URLs, opened with `noopener noreferrer`.

## Honesty about limits

- Never describe local storage as a guaranteed backup.
- Elapsed time comes from timestamps, never from counting ticks; a recovered
  draft resumes paused rather than counting the time the app was closed.
- The metronome is guaranteed only in the foreground; say so in the interface.
- Self-reported BPM is evidence, not a score. Do not rank or grade practice.
- Keep the tone neutral: no streak shaming, loss aversion, or red failure
  states for a missed goal.

## Accessibility

Every flow must work with the keyboard alone, expose state through more than
colour or sound, keep charts mirrored by a data table, and honour
`prefers-reduced-motion`. Reordering must never be drag-only.

## Validation

Run `npm run validate` for every change and `npm run test:e2e` when session,
metronome, persistence, backup, routing, or PWA behaviour changes. Update
`docs/SERVICE_MANIFEST.md` when an operational contract changes and
`docs/REQUIREMENTS.md` when the baseline changes.
