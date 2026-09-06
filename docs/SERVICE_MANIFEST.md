# Service Manifest: Practice Companion

## Identity

- Platform architecture version: 1.3
- Service ID: `practice`
- Product name: Practice Companion
- Repository: https://github.com/brunowinkeler/bwinkeler-music-practice
- Owner: Bruno Winkeler
- Criticality: experimental

## Publication

- Production origin: https://practice.bwinkeler.com (pending DNS attachment)
- Hosting: Cloudflare Pages Direct Upload
- Pages project: `bwinkeler-practice`
- Production branch: `main`
- Build command: `npm run build`
- Build output: `dist`
- Output type: static single-page app plus a Workbox service worker
- Single-page fallback: `public/_redirects`
- VPS dependency: none
- Caddy route: none
- Public API: none
- WebSocket: none

## Runtime resources

- Containers: none
- Database: none
- Redis or queue: none
- Object storage: none
- Server-side state: none
- Runtime secrets: none
- Deployment secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`
- Client-side state: practice records in IndexedDB (`bwinkeler-practice`),
  language and theme mirrored in `localStorage`, plus the service worker cache
- Execution: visitor CPU for React rendering and Web Audio scheduling

## Build contract

- Node.js: 22.14.0 (`.node-version`)
- Package manager: npm, lockfile committed
- Install command: `npm ci`
- Validation command: `npm run validate`
- Browser tests: `npm run test:e2e`
- Icon regeneration: `npm run icons`

## Artefact budget

Enforced by `scripts/check-artifacts.mjs`:

- total `dist`: 1 MiB
- any single JavaScript file: 250 KiB compressed
- no source maps, no inline scripts, no unexpected remote URLs
- `_headers` present, without `unsafe-inline` or `unsafe-eval`
- `_redirects` provides the single-page fallback
- manifest with 192 px, 512 px, and 512 px maskable icons of the declared size

## Health and operations

- Liveness: `GET /` returns the Today view
- Smoke test: start the last routine, run the metronome, finish and save, then
  confirm the session in History
- Offline check: reload with the network disabled after one successful visit
- Backup check: export JSON, delete all data, restore, confirm the counts
- Log format: Cloudflare platform logs; client failures appear in browser tools

## Security and privacy

- Authentication: none
- Registration: none
- Cookies: none
- Analytics: none
- Personal data: practice records stay on the visitor's device and are never
  transmitted; the operator cannot read or recover them
- Third-party requests: none
- Content Security Policy and `Permissions-Policy`: `public/_headers`
- Browser APIs requiring user activation: Web Audio, file download and upload
- Browser APIs requested opportunistically: `navigator.storage.persist()`
- Known limits: browser storage can be evicted; metronome audio is guaranteed
  only in the foreground; a recovered draft resumes paused
- Interface languages: `pt-BR` (default) and `en`

## Deploy

- CI workflow: `.github/workflows/ci.yaml`
- Deployment workflow: `.github/workflows/deploy.yaml`
- Deployment: Wrangler uploads the prebuilt `dist` after CI succeeds on `main`
- Release identifier: Git SHA
- Database migration: client-side only, run by Dexie on first load after a
  schema bump
- Rollback: redeploy the previous successful Pages deployment, or revert `main`

## Dependencies

- External services: GitHub, Cloudflare Pages, Cloudflare DNS
- Infrastructure changes required: Pages custom domain and an inventory entry
- Shared host changes: none
- Portability: `dist` can be served by any static host that returns the correct
  MIME types, serves `/sw.js` from the site root, and falls back to
  `index.html` for unknown paths

## Open decisions

- Decide whether Practice Companion stays the public product name before the
  custom domain is announced.
- Decide whether the portfolio project catalogue links the app once the domain
  is verified.
