# 🏗️ DFS Architecture

This document describes the architecture of the Distributed File System.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Client                             │
│                   (Browser / CLI)                       │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/REST
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Express Server                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │  CORS    │→ │  Morgan   │→ │  JSON Body Parser     │  │
│  └──────────┘  └──────────┘  └───────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                   Router                            │ │
│  │  /api/health     → Health Check                     │ │
│  │  /api/auth/*     → Auth Controller                  │ │
│  │  /api/files/*    → File Controller (Phase 2)        │ │
│  └─────────────────────────────────────────────────────┘ │
│                        │                                 │
│              ┌─────────┴──────────┐                      │
│              ▼                    ▼                       │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │  Auth Middleware  │  │  Error Handler   │              │
│  │  (JWT Verify)     │  │  (Global Catch)  │              │
│  └──────────────────┘  └──────────────────┘              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  MySQL Database                          │
│  ┌─────────┐ ┌─────────┐ ┌──────────────┐               │
│  │  users  │ │  files  │ │ storage_nodes │               │
│  └─────────┘ └────┬────┘ └──────┬───────┘               │
│                   │             │                        │
│              ┌────┴────┐  ┌─────┴─────┐                  │
│              │ chunks  │  │ replicas  │                   │
│              └─────────┘  └───────────┘                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Storage Nodes                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  node1/  │  │  node2/  │  │  node3/  │               │
│  │  chunks  │  │  chunks  │  │  chunks  │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Express Server (`server.js` + `server/app.js`)

The entry point and HTTP layer.

- **`server.js`** — Boots the app: tests DB connection, then starts listening
- **`server/app.js`** — Configures Express: middleware stack, route mounting, error handling

**Middleware chain** (order matters):
```
Request → JSON Parser → CORS → Morgan Logger → Router → 404 Handler → Error Handler → Response
```

### 2. Configuration (`server/config/`)

- **`index.js`** — Centralized config loader. Reads from `.env` via `dotenv`. Every module imports config from here instead of reading `process.env` directly.
- **`db.js`** — MySQL connection pool (10 connections, keepalive enabled).

### 3. Authentication (`server/middleware/`, `server/controllers/`, `server/models/`)

**Flow:**

```
Register:
  Client → POST /api/auth/register → Validate Input → Hash Password → Insert User → Generate JWT → Response

Login:
  Client → POST /api/auth/login → Validate Input → Find User → Compare Password → Generate JWT → Response

Protected Route:
  Client → GET /api/auth/profile → Extract Token → Verify JWT → Find User in DB → Attach to req.user → Controller
```

**Security measures:**
- Passwords stored as bcrypt hashes (10 salt rounds)
- JWT tokens expire after 24 hours
- Login errors never reveal which field (email or password) is wrong
- `findById()` never returns `password_hash`
- All queries use parameterized statements

### 4. Database (`database/`)

**5 tables** connected by foreign keys:

```
users ──(1:many)──▶ files ──(1:many)──▶ chunks ──(1:many)──▶ replicas
                                           │                    │
                                           └──▶ storage_nodes ◀─┘
```

| Table | Records |
|-------|---------|
| `users` | One row per registered account |
| `files` | One row per uploaded file (metadata only) |
| `storage_nodes` | One row per storage location (3 in dev) |
| `chunks` | One row per file piece (a 10MB file with 4 chunks = 4 rows) |
| `replicas` | One row per chunk copy on a different node |

### 5. Storage Nodes (`server/storage/`)

In development, storage nodes are **local directories** (`node1/`, `node2/`, `node3/`). In production, these would be separate servers.

Each node stores file chunks as binary files. The `chunks` table maps chunk → node + file path.

---

## Data Flows

### File Upload (Phase 2)

```
1. Client sends file via POST /api/files/upload
2. Server receives the file into uploads/ directory
3. Chunking service splits the file:
   - 10MB file → 4 chunks of 2.5MB each
   - Each chunk gets a SHA-256 checksum
4. Distribution service assigns chunks to nodes:
   - Chunk 0 → node1
   - Chunk 1 → node2
   - Chunk 2 → node3
   - Chunk 3 → node1 (round-robin)
5. Metadata saved to database:
   - files table: original name, size, chunk count
   - chunks table: chunk index, size, checksum, node, path
6. Replication service copies chunks to other nodes:
   - Chunk 0 (node1) → replica on node2
   - Ensures each chunk exists on at least 2 nodes
7. File status updated to 'complete'
```

### File Download (Phase 2)

```
1. Client requests GET /api/files/:id/download
2. Server queries files + chunks tables
3. For each chunk (ordered by chunk_index):
   - Read chunk from its storage node
   - Verify checksum matches
   - If node is down, read from replica instead
4. Merge all chunks back into the original file
5. Stream the merged file to the client
```

---

## API Design Principles

1. **Consistent response format:**
   ```json
   {
     "success": true|false,
     "message": "Human-readable message",
     "data": { ... },
     "error": { "message": "...", "details": [...] }
   }
   ```

2. **RESTful resource naming:** `/api/auth/register`, `/api/files/:id`

3. **Proper HTTP status codes:**
   - `200` — Success
   - `201` — Created
   - `400` — Bad request (validation)
   - `401` — Unauthorized
   - `404` — Not found
   - `409` — Conflict (duplicate)
   - `500` — Server error

4. **Authentication via Bearer tokens** — stateless, scalable

---

## Project Phases

| Phase | Features | Status |
|-------|----------|--------|
| **Phase 1** | Server, database, authentication, documentation | ✅ Complete |
| **Phase 2** | File upload, chunking, storage distribution | 🔜 Next |
| **Phase 3** | File download, chunk merging, integrity checks | Planned |
| **Phase 4** | Replication, fault tolerance | Planned |
| **Phase 5** | Frontend dashboard | Planned |
