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

## Still open (not changed)
1. **Encryption is advertised but doesn't exist.** Landing page, Features, Stats, HowItWorks, meta tags all claim client-side AES-256. Either implement it (e.g. AES-256-GCM per chunk, key from env or per-user) or reword the copy.
2. **"Distributed" nodes are three folders on one container.** On Railway the filesystem is ephemeral: every redeploy wipes all chunks unless a volume is mounted. Losing the container loses all three nodes at once.
3. Downloads load the whole file into memory (server and browser); 100 MB cap per file. Streaming would need streaming checksum verification.
4. Upload/download go through Vercel's external rewrite: body-size/time limits apply and all users share Vercel egress IPs for IP-based rate limits.
5. Google sign-in auto-links to an existing password account with no email verification at sign-up (account pre-hijacking risk). Require email verification or confirm the link.
6. Password reset doesn't revoke existing JWTs (add a `token_version` column).
7. `vercel.json` rewrites everything to `/index.html`, but the frontend is a TanStack Start SSR build (default nitro target is Cloudflare Workers — see `.output/server/wrangler.json`).
8. `last_heartbeat` updates whenever usage changes; there is no real node heartbeat.
9. No tests in the repo (`npm test` exits 1).

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
