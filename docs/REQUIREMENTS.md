# Requirements: Practice Companion

| Field    | Value                                |
| -------- | ------------------------------------ |
| Document | `BW-PRACTICE-REQ-001`                |
| Version  | 1.0                                  |
| Status   | Baseline for the first release       |
| Source   | `PRACTICE-COMPANION-PROPOSAL.md` §20 |

Verification methods are `I` (inspection), `A` (analysis), `D` (demonstration),
and `T` (test). "Evidence" names the executable check, where one exists.
Requirement identifiers match the proposal so the two documents stay traceable.

## 1. Product and scope

| ID            | Requirement                                                                                                   | Method | Status | Evidence                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------- |
| `PC-PROD-001` | A first-time user can save a completed session within three minutes using the starter flow.                   | D      | Met    | `e2e/practice.spec.ts` first-run test                                     |
| `PC-PROD-002` | The release requires no account, backend, database server, analytics service, or third-party runtime content. | I, A   | Met    | `scripts/check-artifacts.mjs`, `e2e/pwa.spec.ts` third-party request test |
| `PC-PROD-003` | One implicit local profile per browser installation.                                                          | I, T   | Met    | `src/data/db.ts` single settings row                                      |
| `PC-PROD-004` | External learning material is referenced, never reproduced.                                                   | I      | Met    | `Activity.sourceLabel/sourceReference/sourceUrl` only                     |

## 2. Activities and routines

| ID          | Requirement                                                                                               | Method | Status | Evidence                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------ | ------ | -------------------------------------------------------------------- |
| `PC-FR-001` | Create, edit, archive, restore, and delete an activity.                                                   | T      | Met    | `src/features/routines/RoutinesPage.tsx`, `tests/repository.test.ts` |
| `PC-FR-002` | Activity fields: title, area, instructions, source reference, optional HTTPS URL, target BPM, timestamps. | T      | Met    | `tests/backup.test.ts`, `src/features/routines/ActivityForm.tsx`     |
| `PC-FR-003` | Create, edit, duplicate, archive, restore, and delete a routine.                                          | T      | Met    | `RoutinesPage`, `duplicateRoutineRecord`                             |
| `PC-FR-004` | A routine holds explicitly ordered steps with planned duration and optional BPM override.                 | T      | Met    | `tests/repository.test.ts`, `e2e/practice.spec.ts` routine test      |
| `PC-FR-005` | Steps can be reordered without drag and drop.                                                             | T      | Met    | `e2e/practice.spec.ts` reorder test                                  |
| `PC-FR-006` | An activity can be created inline while editing a routine.                                                | T      | Met    | `RoutineEditorPage` inline dialog                                    |
| `PC-FR-007` | Quick practice starts without a routine.                                                                  | T      | Met    | `e2e/practice.spec.ts` quick-practice test                           |

## 3. Sessions and time

| ID          | Requirement                                                                 | Method | Status | Evidence                                     |
| ----------- | --------------------------------------------------------------------------- | ------ | ------ | -------------------------------------------- |
| `PC-FR-020` | Start, pause, resume, finish, and discard a session.                        | T      | Met    | `e2e/practice.spec.ts`                       |
| `PC-FR-021` | Elapsed time comes from timestamps and accumulated pauses, not tick counts. | I, T   | Met    | `tests/timing.test.ts`                       |
| `PC-FR-022` | An active or paused session recovers after reload or restart.               | T      | Met    | `e2e/practice.spec.ts` recovery test         |
| `PC-FR-023` | A completed session and its entries commit atomically.                      | T      | Met    | `tests/repository.test.ts`                   |
| `PC-FR-024` | A partially completed routine can be finished and saved.                    | T      | Met    | `e2e/practice.spec.ts` first-run test        |
| `PC-FR-025` | A completed session's duration can be corrected from history.               | T      | Met    | `src/features/history/SessionDetailPage.tsx` |

## 4. Metronome and reflection

| ID          | Requirement                                                                 | Method | Status | Evidence                                                                  |
| ----------- | --------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------- |
| `PC-FR-030` | Web Audio look-ahead scheduling, integer tempo 30–300 BPM.                  | I, T   | Met    | `tests/scheduler.test.ts`                                                 |
| `PC-FR-031` | Direct entry, steppers, tap tempo, 2/4, 3/4, 4/4, 6/8, downbeat accent.     | T      | Met    | `tests/scheduler.test.ts`, `MetronomePanel`                               |
| `PC-FR-032` | Synchronised audio and non-colour-only visual beat cues.                    | D, T   | Met    | `e2e/practice.spec.ts` metronome test; downbeat differs in shape and size |
| `PC-FR-033` | Audio starts only after user activation and exposes an unavailable state.   | T      | Met    | `Metronome.start`, `metronome.unavailable` message                        |
| `PC-FR-040` | Plain-text session and `Next time` notes.                                   | T      | Met    | `e2e/practice.spec.ts`, no HTML rendering                                 |
| `PC-FR-041` | Optional target, starting, and ending BPM, without treating BPM as quality. | I, T   | Met    | `progress.tempoNotice` copy, `tests/stats.test.ts`                        |

## 5. History, goals, and progress

| ID          | Requirement                                                                              | Method | Status | Evidence                              |
| ----------- | ---------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------- |
| `PC-FR-050` | Review, edit, and delete completed sessions in reverse-chronological history.            | T      | Met    | `HistoryPage`, `SessionDetailPage`    |
| `PC-FR-051` | Weekly duration, practice days, area distribution, recent activities, and tempo history. | T      | Met    | `tests/stats.test.ts`, `ProgressPage` |
| `PC-FR-052` | Calendar statistics use local day boundaries and survive daylight saving.                | T      | Met    | `tests/stats.test.ts`                 |
| `PC-FR-053` | History keeps activity and routine snapshots after the source changes.                   | T      | Met    | `tests/repository.test.ts`            |
| `PC-FR-054` | Optional weekly minute and practice-day goals.                                           | T      | Met    | `SettingsPage`, `TodayPage`           |

## 6. Data, backup, and offline operation

| ID            | Requirement                                                                            | Method | Status             | Evidence                                                                     |
| ------------- | -------------------------------------------------------------------------------------- | ------ | ------------------ | ---------------------------------------------------------------------------- |
| `PC-DATA-001` | Structured data lives in IndexedDB under a versioned schema.                           | I, T   | Met                | `src/data/db.ts`, `tests/repository.test.ts`                                 |
| `PC-DATA-002` | Supported older schemas migrate forward transactionally.                               | T      | Not yet applicable | Only schema version 1 exists; a fixture is required with the first migration |
| `PC-DATA-003` | Persistent storage is requested on the first meaningful write and the result is shown. | D, T   | Met                | `store.requestPersistenceOnce`, Settings storage section                     |
| `PC-BKP-001`  | Export a versioned, full-fidelity JSON backup.                                         | T      | Met                | `tests/backup.test.ts`, `e2e/data.spec.ts`                                   |
| `PC-BKP-002`  | Restoring reproduces activities, routines, sessions, goals, and settings.              | T      | Met                | `e2e/data.spec.ts` restore test                                              |
| `PC-BKP-003`  | Restore validates the whole file, then replaces data atomically.                       | T      | Met                | `tests/backup.test.ts`, `tests/repository.test.ts` rollback test             |
| `PC-BKP-004`  | Export completed session entries as safely escaped CSV.                                | T      | Met                | `tests/csv.test.ts`, `e2e/data.spec.ts`                                      |
| `PC-BKP-005`  | CSV cells starting with a formula character are neutralised.                           | T      | Met                | `tests/csv.test.ts`                                                          |
| `PC-ARCH-001` | Every function works after an offline reload following the first load.                 | T      | Met                | `e2e/pwa.spec.ts` offline test                                               |
| `PC-ARCH-002` | An update never forces a reload during an active or paused session.                    | T, D   | Met                | `AppShell` update banner disabled while a session exists                     |

## 7. Security and privacy

| ID            | Requirement                                                                                          | Method | Status                                              | Evidence                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- | ------------------------------------------------------------------ |
| `PC-SEC-001`  | Import rejects oversized, malformed, unsupported, or invalid files without changing data.            | T      | Met                                                 | `tests/backup.test.ts`, `e2e/data.spec.ts`                         |
| `PC-SEC-002`  | Imported objects reject prototype-pollution keys.                                                    | T      | Met                                                 | `tests/backup.test.ts`                                             |
| `PC-SEC-003`  | User and imported text renders without HTML execution.                                               | T      | Met                                                 | No `dangerouslySetInnerHTML`; React text nodes only                |
| `PC-SEC-004`  | External references accept only approved protocols and open without opener or referrer.              | T      | Met                                                 | `sanitizeUrl`, `rel="noopener noreferrer"`, `tests/backup.test.ts` |
| `PC-SEC-005`  | Production enforces a restrictive CSP without inline scripts, `unsafe-eval`, or third-party origins. | I, T   | Met in build; verify on the origin after deployment | `public/_headers`, `scripts/check-artifacts.mjs`                   |
| `PC-PRIV-001` | No practice data, identifier, or analytics event is transmitted.                                     | A, T   | Met                                                 | `e2e/pwa.spec.ts` third-party request test                         |
| `PC-PRIV-002` | Local storage, export, deletion, and eviction limits are explained in plain language.                | I      | Met                                                 | Onboarding storage notice, Settings storage and privacy text       |

## 8. Accessibility, responsiveness, and operations

| ID            | Requirement                                                                                                 | Method | Status                                                  | Evidence                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------- | ----------------------------------------------------------- |
| `PC-A11Y-001` | Core flows conform to WCAG 2.2 AA with no critical automated finding and a keyboard pass.                   | T, A   | Automated checks met; manual screen-reader pass pending | `e2e/a11y.spec.ts`                                          |
| `PC-A11Y-002` | Audio is never the only channel for metronome or session state.                                             | T, D   | Met                                                     | Visual beat, status text, live announcements                |
| `PC-A11Y-003` | The interface honours `prefers-reduced-motion`.                                                             | T      | Met                                                     | `src/styles.css`                                            |
| `PC-A11Y-004` | Charts expose the same data through a table.                                                                | T      | Met                                                     | `e2e/a11y.spec.ts` table test                               |
| `PC-UX-001`   | Content fits 320 CSS pixels without horizontal scrolling.                                                   | T      | Met                                                     | `e2e/a11y.spec.ts` viewport test                            |
| `PC-UX-002`   | Session controls stay visible and stable as timer digits change.                                            | T      | Met                                                     | Tabular numerals, `e2e/mobile.spec.ts`                      |
| `PC-I18N-001` | Strings are externalised in typed catalogues for pt-BR and English.                                         | I, T   | Met                                                     | `tests/i18n.test.ts`                                        |
| `PC-OPS-001`  | Production deploys as static assets to Cloudflare Pages with no VPS, Caddy, or PostgreSQL dependency.       | I      | Configured; first deployment pending                    | `.github/workflows/deploy.yaml`, `docs/SERVICE_MANIFEST.md` |
| `PC-OPS-002`  | CI validates formatting, lint, types, unit tests, accessibility, build, artefact policy, and browser tests. | I, T   | Met                                                     | `.github/workflows/ci.yaml`                                 |
| `PC-OPS-003`  | Rollback redeploys a previously validated deployment.                                                       | D      | Documented; not yet exercised                           | `docs/OPERATIONS.md`                                        |

## 9. Open items before the first production release

1. Attach `practice.bwinkeler.com` to the Pages project and record it in the
   infrastructure inventory.
2. Run the manual acceptance list in `docs/OPERATIONS.md`, including a
   screen-reader pass and a ten-minute 120 BPM foreground metronome run at a
   real instrument.
3. Verify the response headers on the custom domain.
4. Restore a real backup into a clean browser profile.
