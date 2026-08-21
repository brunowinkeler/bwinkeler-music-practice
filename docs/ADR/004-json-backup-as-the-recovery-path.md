# ADR 004: JSON backup as the only recovery path

- Status: Accepted
- Date: 2026-08-21
- Deciders: Bruno Winkeler

## Context

All practice data lives in the browser. IndexedDB is persistent storage, but it
can still be cleared by the user, the browser under storage pressure, a device
policy, private-browsing behaviour, or an operating-system cleanup. Requesting
`navigator.storage.persist()` reduces the risk without removing it, and the
operator has no copy to restore from.

An imported backup is also the one place where attacker-controlled data reaches
the database, so the import path is a security boundary, not a convenience.

## Decision

A versioned JSON export is the authoritative recovery format, and restore is a
full replacement.

The file carries `format`, `schemaVersion`, `appVersion`, `exportedAt`, record
counts, an FNV-1a checksum over a canonical serialisation, and the data itself.
The checksum detects accidental corruption; it is not a signature and is not
claimed to be one.

Import is validated field by field before a single record is written:

- files larger than 5 MiB are rejected outright;
- malformed JSON, a foreign `format`, or a newer `schemaVersion` is rejected
  with a specific message rather than a partial import;
- every object rejects `__proto__`, `prototype`, and `constructor` keys;
- strings, integers, enumerations, instants, and URLs are range-checked, and a
  non-`https` source URL is stripped instead of stored;
- unknown fields are dropped, so a future file cannot smuggle records in;
- routine steps pointing at a missing activity are dropped, and activities
  pointing at a missing area are re-pointed at the first area.

Only after the whole file validates does `replaceAll` clear and repopulate every
table inside one Dexie transaction. A failure anywhere leaves the current
database untouched, and the interface says so.

CSV export exists for spreadsheet analysis, is lossy, and is never imported.
Cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return are prefixed
with an apostrophe so a practice note cannot become a formula.

The application also tracks when the last export happened and how many sessions
were completed since, and reminds the learner after 14 days or ten sessions. The
reminder states what it knows: the app can prove that an export was triggered,
not that the file still exists.

## Consequences

- Backup and restore had to exist from the first milestone, while the schema was
  still small, rather than after the data model settled.
- Every schema change needs a matching backup schema decision and a fixture.
- `tests/backup.test.ts` covers round-trip fidelity and each rejection path;
  `e2e/data.spec.ts` proves that export, delete-all, and restore return the app
  to an equivalent state in a real browser.
- Merge-style restore was rejected: reconciling duplicate identifiers and edited
  history is far harder to explain and to verify than replacement.
