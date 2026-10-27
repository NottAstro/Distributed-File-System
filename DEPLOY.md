# Deploying upLoader

Two parts: the **API** (Express + MySQL + chunk storage) and the **frontend**
(TanStack Start). The browser calls the API directly at `VITE_API_URL`; the
API allows the frontend's origin via CORS. There is no proxy in between.

> Status on 27 Oct 2026: the Railway service behind
> `distributed-file-system-production.up.railway.app` returns "Application
> not found", and `distributed-file-system-seven.vercel.app` returns
> `DEPLOYMENT_NOT_FOUND`. Both need to be set up again (steps below).

## 1. API (Railway, Render, Fly…)

1. Create a service from this repo — **root directory: repo root**, start
   command `npm start` (Node 20+).
2. Add a **MySQL 8** database and note its host/port/user/password/name.
3. Mount a **persistent volume** at `<app dir>/server/storage` (on Railway:
   `/app/server/storage`). Without it, every redeploy deletes all file chunks.
4. Set the environment variables (see `.env.example`):

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | `ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — **back it up; losing it loses every file** |
   | `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | from the MySQL service |
   | `FRONTEND_URL` | e.g. `https://distributed-file-system-seven.vercel.app` (no trailing slash) |
   | `CORS_ORIGIN_REGEX` | optional, for preview deploys: `^https://distributed-file-system-[a-z0-9]+-nottastro\.vercel\.app$` |
   | `GOOGLE_CLIENT_ID` | Google Cloud OAuth "Web" client ID |
   | `RESEND_API_KEY` + `SMTP_FROM` | for email codes / reset links ([resend.com](https://resend.com); `SMTP_FROM` must use a domain verified there) |

   The server refuses to start in production without `JWT_SECRET` and
   `ENCRYPTION_KEY` — check the deploy log if it won't boot.
5. **First deploy only:** create the tables and storage nodes once:
   `npm run db:init` with the same DB variables (Railway: `railway run npm run db:init`).
   It never drops tables, so re-running is safe. Later schema changes apply
   automatically on start-up.
6. Check: `https://<api-host>/api/health` → `{"success":true,…}` and
   `https://<api-host>/api/auth/config` → shows `googleClientId` and `emailEnabled`.

## 2. Frontend (Vercel)

1. Project **root directory: `Frontend`**, framework preset: Other (the build
   emits Vercel's output format itself).
2. Environment variable: `VITE_API_URL=https://<api-host>/api` (Production
   and Preview). It's read at build time, so **redeploy after changing it**.
3. Settings → Domains: make sure your production domain is assigned to the
   project (it currently isn't).
4. If a deployment fails, open it in Vercel → Build Logs. The 26 Oct
   deployment (`6f63cbc`) failed on Vercel although the same build passes
   locally with `VERCEL=1`, so look for a project or account problem there.

## 3. Google sign-in

Google Cloud Console → APIs & Services → Credentials → your OAuth client →
**Authorized JavaScript origins**: add the frontend URL (and
`http://localhost:5173` for development). The frontend gets the client ID from
the API, so it only has to be set once, as `GOOGLE_CLIENT_ID` on the API.

## 4. Existing files and encryption

When `ENCRYPTION_KEY` is set, chunks stored earlier without encryption are
encrypted in the background on start-up (log line `Encrypt migration: …`).
Set `ENCRYPT_EXISTING_ON_BOOT=false` to skip that and run
`npm run encrypt:existing` yourself. Both are safe to repeat or interrupt.

Never change `ENCRYPTION_KEY` once files are stored — key rotation isn't
supported yet.
