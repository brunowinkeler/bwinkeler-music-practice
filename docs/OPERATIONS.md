# Operations: Practice Companion

## 1. Local development

```bash
npm ci
npm run dev            # http://localhost:5173
npm run validate       # format, lint, types, unit tests, build, artefact policy
npm run test:e2e       # Playwright, serves dist on http://127.0.0.1:4327
```

`npm run test:e2e` starts `npm run preview` automatically. Install browsers once
with `npx playwright install --with-deps chromium`.

## 2. Continuous integration

`.github/workflows/ci.yaml` runs on every pull request and every push to `main`:

1. `npm ci`
2. `npm run validate`
3. `npm run icons` and a `git diff --exit-code` on `public/icons`, so the
   committed icons stay reproducible
4. `npx playwright install --with-deps chromium`
5. `npm run test:e2e`, which includes the axe accessibility checks
6. uploads `dist` as a build artefact

## 3. Deployment

`.github/workflows/deploy.yaml` runs after CI succeeds on `main`. It checks out
the validated revision, rebuilds, re-runs `npm run check:artifacts`, and uploads
`dist` to Cloudflare Pages with Wrangler.

Required repository environment (`production`) secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` (Pages: Edit)

Manual deployment from a workstation, when needed:

```bash
npm run build
npm run check:artifacts
npm run deploy
```

The custom domain is attached in the Cloudflare dashboard; `wrangler pages` has
no custom-domain command. Record the domain in the infrastructure inventory.

## 4. Post-deployment verification

1. Load the origin and confirm the Today view renders.
2. Check the response headers on the custom domain:

    ```bash
    curl -sI https://practice.bwinkeler.com | findstr /i "content-security-policy permissions-policy x-content-type-options"
    ```

3. Confirm `/sw.js` and `/manifest.webmanifest` answer with `Cache-Control:
no-cache`. A zone-level browser cache TTL can override this; set the cache
   rule to respect existing headers if it does.
4. Load a deep route directly, for example `/settings`, to confirm the
   single-page fallback.
5. Run the smoke test: start a routine, run the metronome, finish and save,
   confirm the session appears in History.
6. Reload once with the network disabled and confirm the app still works.

## 5. Rollback

1. Open the Pages project, select the previous successful deployment, and
   promote it, or
2. revert the offending commit on `main` and let CI and the deploy workflow run.

Rolling back the application never touches user data: records live only in the
visitor's browser. If a release changed the local database schema, a rollback
leaves already-migrated browsers on the newer schema, so prefer a forward fix
whenever a migration has shipped.

## 6. Data recovery

The operator cannot recover a user's practice data; it never leaves the device.
Recovery is entirely in the learner's hands:

1. Settings → **Export backup (JSON)** on a healthy device.
2. Keep the file where personal device backups already reach.
3. Settings → **Restore backup** → choose the file → review the export date and
   counts → **Replace everything**.

Restore validates the whole file before writing and replaces the database in one
transaction. A rejected file leaves the current data untouched. CSV export is
for analysis only and is never imported.

## 7. Release checklist

Before the first production release, and after any change to session, audio,
persistence, or backup behaviour:

- [ ] `npm run validate` and `npm run test:e2e` pass
- [ ] a full practice session run at a real piano or keyboard
- [ ] controls readable and reachable with the device on a music stand
- [ ] a ten-minute foreground metronome run at 120 BPM without missed beats
- [ ] a screen-reader pass on the intended iPhone or iPad
- [ ] PWA installation plus an offline launch
- [ ] a backup copied off the device and restored into a clean browser profile
- [ ] update deferral confirmed during an active session
- [ ] no unexpected third-party network request in the browser tools
- [ ] CSP and other response headers verified on the custom domain

## 8. Maintenance

- Dependencies and GitHub Actions are version-pinned; review changelogs before
  bumping React, Dexie, Vite, or `vite-plugin-pwa`.
- A change to `src/data/types.ts` requires a database schema bump, a Dexie
  upgrade step, a migration fixture, and usually a backup schema bump.
- A new user-facing string must be added to both locale catalogues in the same
  commit; `tests/i18n.test.ts` enforces it.
- Re-run `npm run icons` after changing the icon artwork and commit the result.
