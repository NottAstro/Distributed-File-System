# upLoader — Distributed File System

A full-stack **Distributed File System** that splits uploaded files into erasure-coded chunks, distributes them across multiple storage nodes, and can reconstruct the original file even if one node fails. Built with Node.js, Express, MySQL, React, and deployed on Railway + Vercel.

---

## How It Works

```
┌──────────┐       ┌──────────────┐       ┌─────────┐
│  Browser │──────▸│ Express API  │──────▸│  MySQL  │
│ (React)  │◂──────│  (Node.js)   │◂──────│   DB    │
└──────────┘       └──────┬───────┘       └─────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │  Node 1 │ │  Node 2 │ │  Node 3 │
         │ (Data1) │ │ (Data2) │ │(Parity) │
         └─────────┘ └─────────┘ └─────────┘
```

When you upload a file:

1. The file is split in half → **Data1** and **Data2**
2. A **Parity** chunk is computed: `Parity[i] = Data1[i] XOR Data2[i]`
3. Each chunk is saved to a different storage node with a SHA-256 checksum
4. The temporary upload is deleted

When you download:

- If all nodes are healthy → concatenate Data1 + Data2
- If Node 1 is down → reconstruct Data1 from Data2 XOR Parity
- If Node 2 is down → reconstruct Data2 from Data1 XOR Parity
- If 2+ nodes are down → file cannot be recovered (critical failure)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TanStack Router, Tailwind CSS v4, Radix UI |
| **Backend** | Node.js, Express 5, MySQL 8.0 |
| **Auth** | JWT (jsonwebtoken), bcryptjs, Google OAuth 2.0, OTP via email |
| **Security** | Helmet, HPP, CORS, express-rate-limit, parameterized SQL queries |
| **Email** | Nodemailer (Gmail SMTP in production, Ethereal in development) |
| **Deployment** | Railway (backend + MySQL), Vercel (frontend) |

---

## Features

### Distributed File Storage
- **2+1 XOR erasure coding** — every file is split into 2 data chunks + 1 parity chunk
- **Single-node fault tolerance** — files can be fully recovered if any 1 of 3 nodes goes down
- **SHA-256 integrity verification** — every chunk is checksummed on write and verified on read
- **100 MB max upload size** per file

### Authentication
- **Email + password** registration and login (bcrypt hashed, 10 salt rounds)
- **Google OAuth 2.0** sign-in with automatic account linking
- **Passwordless OTP login** — 6-digit code sent via email (bcrypt hashed, 5-min expiry, max 5 attempts)
- **Password reset** via email link (SHA-256 hashed token, 15-min expiry, single-use)
- **Anti-enumeration** — login, OTP, and reset endpoints return identical responses regardless of whether the email exists

### Security
- **JWT tokens** signed with HMAC-SHA256 (24h expiry, payload: `{ id, username }`)
- **Rate limiting** on all routes:
  - Global: 100 req / 15 min
  - Auth: 30 req / 15 min
  - Uploads: 20 req / 15 min
  - OTP & Reset: 5 req / 15 min
- **Helmet** HTTP security headers
- **HPP** parameter pollution protection
- **CORS** with dynamic origin validation (auto-allows `*.vercel.app` previews)
- **Parameterized SQL** on every query (no string concatenation)

### Frontend
- **Dashboard** — searchable file table with upload, download, share, and delete actions
- **Upload panel** — drag-and-drop with file queue, progress bars, and stage indicators
- **File detail panel** — slide-in drawer showing chunk count, node count, encryption, and status
- **Storage page** — usage meter with breakdown by file type
- **Downloads page** — download history with re-download
- **Settings page** — profile editing, password change, danger zone (delete files/account)
- **Landing page** — interactive hero, feature showcase, architecture visualization, stats

---

## API Endpoints

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | Server status and uptime |

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | — | Create account (username, email, password) |
| `POST` | `/api/auth/login` | — | Login with email + password, returns JWT |
| `GET` | `/api/auth/profile` | 🔒 | Get current user profile |
| `POST` | `/api/auth/google` | — | Google OAuth login (ID token) |
| `POST` | `/api/auth/otp/request` | — | Send 6-digit OTP to email |
| `POST` | `/api/auth/otp/verify` | — | Verify OTP code, returns JWT |
| `POST` | `/api/auth/forgot-password` | — | Send password reset link to email |
| `POST` | `/api/auth/reset-password` | — | Reset password with token, returns JWT |

### Files
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/files/upload` | 🔒 | Upload file (multipart), erasure-code and distribute |
| `GET` | `/api/files` | 🔒 | List all files for current user |
| `GET` | `/api/files/:id` | 🔒 | Get file details and chunk info |
| `GET` | `/api/files/:id/download` | 🔒 | Reassemble and download file |
| `DELETE` | `/api/files/:id` | 🔒 | Delete file and all chunks |

### Storage
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/storage` | 🔒 | Get user's storage usage (used bytes, 10 GB quota) |
| `GET` | `/api/nodes` | 🔒 | Get status of all storage nodes |

---

## Database Schema

7 tables in the `distributed_fs` database:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (local + Google OAuth) |
| `files` | Uploaded file metadata (name, size, status, owner) |
| `storage_nodes` | Storage node registry (3 nodes, each 1 GB) |
| `chunks` | Individual erasure-coded pieces (file_id, chunk_index, checksum, node_id, path) |
| `replicas` | Chunk redundancy mirrors (schema present, not yet active) |
| `otp_codes` | Bcrypt-hashed OTP codes for passwordless login |
| `password_reset_tokens` | SHA-256-hashed tokens for password reset |

---

## Project Structure

```
Distributed-File-System/
├── server.js                         # Entry point — starts Express server
├── package.json                      # Backend dependencies and scripts
├── .env.example                      # Environment variables template
│
├── server/
│   ├── app.js                        # Express app (middleware, CORS, rate limits, routes)
│   ├── config/
│   │   ├── index.js                  # Centralized config loader
│   │   └── db.js                     # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js         # Register, login, profile handlers
│   │   ├── oauthController.js        # Google OAuth, OTP, password reset handlers
│   │   └── fileController.js         # Upload, list, download, delete, storage handlers
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verification
│   │   ├── errorHandler.js           # Global error handler
│   │   └── upload.js                 # Multer file upload config (100 MB limit)
│   ├── models/
│   │   └── User.js                   # User DB operations (create, find, compare, update)
│   ├── routes/
│   │   ├── authRoutes.js             # Auth route definitions + validation rules
│   │   └── fileRoutes.js             # File route definitions
│   ├── services/
│   │   ├── chunkService.js           # File splitting, XOR parity, reassembly, deletion
│   │   ├── storageService.js         # Node management, usage tracking
│   │   ├── googleAuthService.js      # Google ID token verification
│   │   ├── otpService.js             # OTP generation, hashing, verification
│   │   ├── resetService.js           # Password reset token creation and verification
│   │   └── emailService.js           # Nodemailer transporter (SMTP / Ethereal)
│   ├── storage/
│   │   ├── node1/                    # Storage node 1 (Data1 chunks)
│   │   ├── node2/                    # Storage node 2 (Data2 chunks)
│   │   └── node3/                    # Storage node 3 (Parity chunks)
│   ├── uploads/                      # Temporary upload staging directory
│   └── utils/
│       └── logger.js                 # Colored console logger
│
├── Frontend/
│   ├── package.json                  # Frontend dependencies
│   ├── vite.config.ts                # Vite config (dev proxy to localhost:3000)
│   ├── vercel.json                   # Vercel rewrite rules (proxy /api to Railway)
│   └── src/
│       ├── routes/                   # TanStack Router pages
│       │   ├── __root.tsx            # Root layout (providers, fonts, toaster)
│       │   ├── index.tsx             # Landing page (/)
│       │   ├── signin.tsx            # Sign in (/signin)
│       │   ├── signup.tsx            # Sign up (/signup)
│       │   ├── forgot-password.tsx   # Forgot password (/forgot-password)
│       │   ├── reset-password.tsx    # Reset password (/reset-password?token=...)
│       │   └── dashboard/
│       │       ├── index.tsx         # My Files (/dashboard)
│       │       ├── storage.tsx       # Storage metrics (/dashboard/storage)
│       │       ├── downloads.tsx     # Download history (/dashboard/downloads)
│       │       └── settings.tsx      # Account settings (/dashboard/settings)
│       ├── components/dfs/           # UI components (AppShell, FileTable, UploadPanel, etc.)
│       ├── lib/core/
│       │   ├── api.ts                # API client (fetch + JWT + all endpoints)
│       │   ├── store.tsx             # React context (auth, files, uploads state)
│       │   ├── types.ts              # TypeScript interfaces
│       │   └── format.ts             # Formatting utilities
│       └── styles.css                # Tailwind CSS v4 entry
│
├── database/
│   ├── schema.sql                    # Full database schema (7 tables)
│   ├── migration_v2.sql              # Migration for OAuth + OTP tables
│   ├── seed.sql                      # Seed data (3 storage nodes)
│   └── init.js                       # Database initializer script
│
└── docs/
    └── architecture.md               # System architecture documentation
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MySQL](https://dev.mysql.com/downloads/mysql/) 8.0
- [Git](https://git-scm.com/)

### 1. Clone and install

```bash
git clone https://github.com/NottAstro/Distributed-File-System.git
cd Distributed-File-System

# Install backend dependencies
npm install

# Install frontend dependencies
cd Frontend
npm install
cd ..
```

### 2. Configure environment

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=distributed_fs

# Authentication
JWT_SECRET=generate_a_strong_random_string
JWT_EXPIRES_IN=24h

# Google OAuth (optional — needed for Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# SMTP (optional — uses Ethereal test accounts in development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="upLoader" <noreply@uploader.app>

# Frontend URL (for password reset email links)
FRONTEND_URL=http://localhost:5173
```

> 🔐 Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 3. Initialize the database

```bash
npm run db:init
```

This creates the `distributed_fs` database, all 7 tables, and seeds 3 storage nodes.

### 4. Start development servers

```bash
# Terminal 1 — Backend (port 3000, auto-restarts on changes)
npm run dev

# Terminal 2 — Frontend (port 5173, proxies /api to localhost:3000)
cd Frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Deployment

### Production Architecture

```
  User → uploader-dfs.vercel.app → /api/* proxied to → Railway backend → Railway MySQL
                                 → /* served as → React SPA
```

- **Frontend**: Deployed on [Vercel](https://vercel.com). The `vercel.json` rewrites `/api/*` requests to the Railway backend, eliminating CORS issues entirely.
- **Backend**: Deployed on [Railway](https://railway.com) with a MySQL plugin. Runs `npm start` (which executes `node server.js`).

### Environment Variables for Production

Set these in your Railway service variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | From Railway MySQL plugin |
| `DB_NAME` | `distributed_fs` |
| `JWT_SECRET` | A strong random string |
| `CORS_ORIGIN` | `https://your-app.vercel.app` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | Your Google Cloud OAuth client ID |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Your email provider credentials |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start backend server (production) |
| `npm run dev` | Start backend with nodemon (development) |
| `npm run db:init` | Create database, tables, and seed data |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit format, and PR guidelines.

## License

MIT — see [LICENSE](LICENSE).
