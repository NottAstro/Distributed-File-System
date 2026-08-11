# Frontend File Guide

> Quick reference for every file in the DFS frontend.  
> **Route files cannot be renamed** — TanStack Router maps filenames to URLs.

---

## Routes (`src/routes/`)

These files define the **pages** of the app. The filename determines the URL.

| File                      | URL                    | What it is                                                               |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `__root.tsx`              | _(wraps all pages)_    | **App Shell** — HTML head, fonts, providers, 404 page, error page        |
| `index.tsx`               | `/`                    | **Landing Page** — hero, features, stats, footer (public)                |
| `signin.tsx`              | `/signin`              | **Sign In Page** — email + password form                                 |
| `signup.tsx`              | `/signup`              | **Sign Up Page** — name + email + password + strength meter              |
| `dashboard/index.tsx`     | `/dashboard`           | **My Files Page** — file table, search, upload button, file detail panel |
| `dashboard/downloads.tsx` | `/dashboard/downloads` | **Downloads Page** — recently retrieved files list                       |
| `dashboard/storage.tsx`   | `/dashboard/storage`   | **Storage Page** — usage meter, breakdown by file type                   |
| `dashboard/settings.tsx`  | `/dashboard/settings`  | **Settings Page** — profile, security, 2FA, sessions, danger zone        |

---

## Components (`src/components/dfs/`)

Reusable UI pieces used across pages.

| File                  | What it is                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `AppShell.tsx`        | **Dashboard Layout** — sidebar navigation + top bar + mobile bottom nav + upload panel. Wraps all `/dashboard/*` pages |
| `Button.tsx`          | **Button Component** — variants: primary (solid), secondary (glass), ghost, danger, accent, icon                       |
| `Field.tsx`           | **Input Fields** — text input, password input (with show/hide toggle), password strength bar                           |
| `FileTable.tsx`       | **File List Table** — rows showing file name, size, type, date, status, action buttons (download/share/delete)         |
| `FileDetailPanel.tsx` | **File Detail Slide-in** — metadata display (size, chunks, nodes, encryption), download/share/delete actions           |
| `UploadPanel.tsx`     | **Upload Slide-in Panel** — drag-and-drop zone, file queue with progress stages (encrypting → chunking → distributing) |
| `Hero.tsx`            | **Landing Hero Section** — main headline, subtitle, CTA buttons                                                        |
| `HowItWorks.tsx`      | **How It Works Section** — orchestration diagram showing file → chunks → nodes                                         |
| `Features.tsx`        | **Features Section** — secure upload, distributed storage, instant download                                            |
| `Stats.tsx`           | **Stats Bar** — metric counters (files, uptime, encryption, latency)                                                   |
| `LandingNav.tsx`      | **Landing Page Navbar** — glassmorphic fixed header with navigation links + sign in/get started buttons                |
| `Footer.tsx`          | **Page Footer** — multi-column footer with links                                                                       |
| `Logo.tsx`            | **Logo + Utilities** — DFS logo SVG, file type icon, and pill/badge component                                          |
| `StatusDot.tsx`       | **Status Indicator** — colored dot + label (Distributed = teal, Processing = amber, Failed = red)                      |
| `StorageMeter.tsx`    | **Storage Usage Bar** — progress bar showing used vs quota, color changes at 75% and 90%                               |

---

## Shared UI (`src/components/ui/`)

| File         | What it is                                                                                |
| ------------ | ----------------------------------------------------------------------------------------- |
| `sonner.tsx` | **Toast Notifications** — styled wrapper around `sonner` library for success/error popups |

---

## Library (`src/lib/`)

| File               | What it is                                                               |
| ------------------ | ------------------------------------------------------------------------ |
| `utils.ts`         | **CSS Utility** — `cn()` function to merge Tailwind class names          |
| `error-capture.ts` | **SSR Error Logger** — captures server-side errors for the error page    |
| `error-page.ts`    | **Fallback Error HTML** — static HTML error page rendered when SSR fails |

---

## DFS Logic (`src/lib/dfs/`)

| File           | What it is                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`     | **TypeScript Types** — `DfsFile`, `DfsUser`, `StorageUsage`, `UploadItem`, status enums                                                                                         |
| `api.ts`       | **API Layer (MOCK)** — all backend calls (signIn, signUp, listFiles, uploadFile, downloadFile, etc.). Replace function bodies with real `fetch()` calls to your Express backend |
| `store.tsx`    | **App State (React Context)** — holds user session, file list, upload queue, storage usage. Provides `useDfs()` hook                                                            |
| `format.ts`    | **Formatters** — `formatBytes()`, `formatDate()`, `initials()`, `extensionOf()`                                                                                                 |
| `mock-data.ts` | **Fake Data** — sample files, user, sessions, storage for demo. Remove when connecting to real backend                                                                          |

---

## Config Files (root)

| File               | What it is                                                                         |
| ------------------ | ---------------------------------------------------------------------------------- |
| `package.json`     | **Dependencies & Scripts** — `npm run dev` to start, `npm run build` to build      |
| `vite.config.ts`   | **Build Config** — Vite + TanStack Start setup                                     |
| `tsconfig.json`    | **TypeScript Config** — compiler settings, path aliases (`@/` = `src/`)            |
| `eslint.config.js` | **Linter Config** — code style rules                                               |
| `.prettierrc`      | **Formatter Config** — code formatting rules                                       |
| `components.json`  | **shadcn/ui Config** — component generator settings (for adding new UI components) |
| `DESIGN_PROMPT.md` | **Design Specification** — full UI/UX design guide for this project                |

---

## Auto-Generated (do NOT edit)

| File                   | What it is                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/routeTree.gen.ts` | **Route Map** — auto-generated by TanStack Router from the `routes/` filenames. Regenerated on `npm run dev` |
| `src/router.tsx`       | **Router Instance** — creates the TanStack router with the generated route tree                              |
| `src/server.ts`        | **SSR Entry** — server-side rendering entry point with error recovery                                        |
| `src/start.ts`         | **Middleware** — CSRF protection and error handling middleware                                               |
