# ADR 001: A static, local-first React application

- Status: Accepted
- Date: 2026-08-21
- Deciders: Bruno Winkeler

## Context

Practice Companion serves one learner at a time and needs no sharing,
collaboration, or server-side computation. The workspace already runs a VPS with
Caddy and PostgreSQL, so hosting a small backend would be possible. The product
does, however, hold private free-text reflections about a person's habits and
schedule.

The application is also state-heavy for a static site: persistent forms, a
routine editor, a session runner with recovery, derived weekly statistics, and
routing with deep links.

## Decision

Ship a fully static Progressive Web App on Cloudflare Pages, with all user data
in the browser's IndexedDB through Dexie, built with TypeScript, Vite, React,
and React Router.

Consequences of the boundary:

- no account, session cookie, API, or server-side record;
- no VPS, Caddy route, container, or database to patch and monitor;
- no operator access to practice data, therefore no operator-side recovery;
- adding synchronisation later is a new product tier requiring its own ADR,
  threat model, and service manifest, not a routine enhancement.

React was chosen over the framework-free approach used by KeyPlay because this
product's persistent forms, recoverable session state, and derived views are the
kind of state a component model manages well. Dexie was chosen over hand-written
IndexedDB code for its versioned upgrades and transactions.

Deliberately not adopted: a schema-validation library (a hand-written validator
in `src/data/validation.ts` keeps the import boundary explicit and the bundle
small), a charting library (native tables and CSS bars are accessible by
construction), and an icon package (`src/components/Icon.tsx` draws the dozen
glyphs the app uses).

## Consequences

- The production runtime has no secrets, no environment variables, and no health
  endpoint beyond the static origin.
- Data durability depends on browser storage, so a tested JSON backup and
  restore path is a first-class feature rather than a nice-to-have (ADR 004).
- The bundle carries React, React Router, and Dexie: roughly 135 KiB compressed,
  inside the 250 KiB budget enforced by `scripts/check-artifacts.mjs`.
- Any future feature that needs a server crosses the boundary this ADR sets and
  must be argued separately.
