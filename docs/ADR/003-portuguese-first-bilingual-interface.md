# ADR 003: A Portuguese-first bilingual interface

- Status: Accepted
- Date: 2026-08-21
- Deciders: Bruno Winkeler

## Context

The primary user is a Brazilian learner, while the repository, its history, and
its documentation are written in English so the project stays legible to any
engineer. Retrofitting localisation after the fact touches labels, dates,
accessibility names, tests, and layout, so the decision cannot be deferred.

## Decision

Keep code, comments, documentation, commit messages, identifiers, and domains in
English. Ship the interface in Brazilian Portuguese by default with English
available, and never translate content the learner typed.

Every visible string lives in typed catalogues: `src/i18n/pt-BR.ts` defines the
key set, and `src/i18n/en.ts` is typed as `Messages`, so a missing English key is
a compile error. `tests/i18n.test.ts` additionally fails when a translation is
empty or when the two catalogues disagree about placeholders.

Built-in practice areas are stored by key (`builtInKey`) and translated at
render time, so switching language relabels history correctly. User-created
areas store the typed name and are shown verbatim. Session entries snapshot both
the area key and the area name so history stays readable in either language.

Dates, times, and weekday names are formatted with `Intl` using the selected
language. The static `index.html` and the PWA manifest are written in
Portuguese, so the first paint and the installed app name are already correct.

## Consequences

- A new user-facing string requires editing both catalogues in the same commit.
- Locale-dependent strings must never be concatenated from fragments; they use
  `{token}` placeholders that the parity test checks.
- Adding a third language means adding one catalogue and one entry in
  `src/i18n/index.ts`; nothing else changes.
