# Audit, changes & hosting notes

## Fixed in this change
| Area | Problem | Fix |
|---|---|---|
| DB | `schema.sql` began with `DROP TABLE` for every table, so `npm run db:init` (documented as "safe to re-run") deleted all data | DROPs moved to `database/reset.sql`; init also honours `DB_NAME` |
| Upload | Upload rate limiter was mounted *after* the router, so it never ran | Per-user limiter inside `fileRoutes.js` |
| Upload | Failure after the DB insert left `uploading` rows, which crashed the dashboard (`StatusDot` had no `uploading` state) | Capacity/quota checks run before insert; failures purge rows, chunks and the temp file |
| Upload | Non-ASCII names became mojibake (multer latin1 default); user filename used on disk | `defParamCharset: 'utf8'`, random temp names |
| Upload | 10 GB quota shown but never enforced | Enforced (413) — `STORAGE_QUOTA_BYTES` |
| Download | Raw `filename="…"` header crashed on quotes / non-Latin names | `res.attachment()` (RFC 6266) + client parses `filename*` |
| Errors | Multer "file too large" and bad JSON returned 500 | Mapped to 413 / 400 |
| Auth | Password login to a Google-only account → 500 (`bcrypt.compare(…, null)`) | Treated as wrong password (401) |
| Auth | Reset token SELECT-then-UPDATE race allowed reuse | Atomic claim |
| Auth | Fallback JWT secret silently used in production | Server refuses to start without `JWT_SECRET` |
| Auth | Expired token left the dashboard "signed in" with every call failing | Any 401 signs out with a notice |
| CORS | Any `*.vercel.app` origin was allowed | Removed (prod is same-origin via the proxy) |
| Limits | Global 100 req/15 min per IP — browsing + a small folder upload hit it | 600/15 min; uploads limited per user (300/15 min) |
| API | `/api/files/:id` and `/api/nodes` leaked server disk paths | Paths removed |
| Perf | Sync `readFileSync`/`writeFileSync` blocked the event loop on every upload | `fs/promises`; parity node rotates per file |
| Misc | OTP/reset `cleanup()` never called | Hourly job |
| UI | Fake progress stages ("Encrypting…"), share links to `dfs.io`, Settings toasts claiming "Password updated", mock sessions, fake Downloads list | Real XHR progress with cancel/retry; fake actions removed or marked "Coming soon"; real download history |

## New: folders
* `folders` table, `files.folder_id`; existing databases are migrated automatically on boot (`server/config/migrate.js`).
* API: `GET /api/folders`, `GET /api/folders/{root|id}/contents`, `POST /api/folders`, `PATCH /api/folders/:id`, `DELETE /api/folders/:id` (recursive, removes chunks from disk).
* Upload accepts `folderId` and `relativePath`; folder uploads (picker or drag-and-drop) recreate the tree, race-free under parallel uploads.

## Dashboard redesign
New sidebar with a **New** menu (New folder / Upload files / Upload folder), breadcrumbs with `?folder=<id>` URLs, folder cards, list/grid views, sort, `/` search across all folders, multi-select bulk download/delete, drop-anywhere overlay, floating upload tray, chunk-placement detail panel, live node health, mobile layout with a floating New button.

## Fixed in the follow-up (login + encryption)
| Area | Problem | Fix |
|---|---|---|
| Production | API calls relied on a `vercel.json` rewrite to a hard-coded Railway host. That host is gone, the rewrite isn't part of the Nitro/Vercel build output, and proxying would cap uploads at ~4.5 MB | Frontend calls `VITE_API_URL` directly; CORS allows `FRONTEND_URL` / `CORS_ORIGIN` / `CORS_ORIGIN_REGEX`; `vercel.json` removed — see DEPLOY.md |
| Login UX | Every failure (server down, rate limit, …) showed "Invalid email or password" | Real server messages everywhere; "can't reach the server" banner on auth pages |
| Gmail | Password/OTP logins stripped dots from Gmail addresses; Google sign-in kept them → OTP failed / duplicate accounts | Emails trimmed + lowercased only; legacy dot-stripped accounts still found |
| Google | Client ID baked into the frontend build; invalid tokens and missing config → 500 | Client ID served by the API (`/api/auth/config`); 401 / 503 with clear messages; button hidden when not configured |
| Email | SMTP blocked on many hosts (Railway below Pro); failures surfaced as 500 | Resend HTTPS API supported; clear 503; email-code tab hidden when email isn't configured |
| Security | Google sign-in linked into unverified password accounts (pre-hijacking) | Linking an unverified account removes its password and revokes its sessions; email codes / reset links / Google mark addresses verified |
| Security | Password reset didn't revoke existing sessions | `users.token_version` in every JWT; reset bumps it |
| Limits | One limiter shared by "send code" and "check code"; 6-char passwords | Separate limiters; 8-char minimum |
| Session | Stale/invalid session stayed "signed in" until the first API call | Session validated with `/api/auth/profile` on load |
| Encryption | Advertised but didn't exist | AES-256-GCM per chunk at rest (random IV, file/position bound as AAD, tamper → parity rebuild); existing chunks migrated on boot or via `npm run encrypt:existing`; copy now says "encrypted at rest" |

## Still open (not changed)
1. **"Distributed" nodes are three folders on one container.** Without a persistent volume every redeploy wipes all chunks, and losing the container loses all three nodes at once.
2. Downloads load the whole file into memory (server and browser); 100 MB cap per file. Streaming would need streaming checksum verification.
3. Encryption keys can't be rotated yet, and the server holds the key (at-rest, not end-to-end, encryption).
4. Sign-up still doesn't send a verification email (accounts become verified via email code, reset link or Google).
5. `last_heartbeat` updates whenever usage changes; there is no real node heartbeat.
6. No tests in the repo (`npm test` exits 1). The verification scripts used for these changes could become the test suite.
7. Landing-page stats ("10,000+ files", "99.9% uptime", "<200 ms") are placeholders, not measurements.

## Hosting alternatives
The real constraint is **durable storage for chunks** — whichever host you choose, persist chunks somewhere that survives redeploys.

| Option | Frontend | API | DB | Chunks | Notes |
|---|---|---|---|---|---|
| **Cloudflare (recommended)** | Workers (the build already targets it) | Keep Express on a VM/Fly, or port to Workers | D1 or keep MySQL | **R2** buckets as nodes (no egress fees) | Cheapest durable option; same-origin via a Worker route |
| **Fly.io** | Fly or Cloudflare | Fly Machine + **volumes** (3 volumes = 3 real nodes, can be in different regions) | Fly MySQL / PlanetScale-compatible | Volumes | Closest to the "real distributed nodes" story |
| **Render** | Static site | Web service + persistent disk | Render doesn't offer MySQL (use Aiven/TiDB) | Disk | Simple, but disk = single instance |
| **Single VPS** (Hetzner/DO/Oracle free tier) | Caddy/Nginx | Docker Compose: API + MySQL | Same box | Local disks / attached volumes | Full control, cheapest at scale; you run backups |
| **Stay on Railway** | — | Attach a Railway **Volume** to `server/storage` | Railway MySQL | Volume | Minimum change to stop data loss |

Making nodes genuinely distributed: store each chunk in a different S3-compatible bucket/provider (e.g. R2 + Backblaze B2 + a volume), with `storage_nodes.storage_path` becoming a bucket URL.

## Verification done
* 31-check API end-to-end run against a local MySQL 8: folders, nested + concurrent folder uploads, UTF-8 names, parity recovery after deleting a chunk, failure cleanup, auth fixes, recursive delete. Also confirmed the startup migration upgrades an old-schema DB.
* Frontend: `tsc` clean, production build OK, dashboard exercised in a browser (folders, new-folder dialog, drop upload, detail panel, search, grid, mobile, expired session).
