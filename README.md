# 📁 Distributed File System (DFS)

A **Distributed File System** built with Node.js, Express, and MySQL that splits files into chunks, distributes them across multiple storage nodes, and replicates them for fault tolerance.

> Think of it like a simplified version of HDFS (Hadoop Distributed File System) or Google File System — built from scratch as a learning project.

---

## ✨ Features

- 🔐 **JWT Authentication** — Register, login, and protected routes
- 🗄️ **MySQL Database** — Structured schema for users, files, chunks, and replicas
- 📦 **File Chunking** — Split large files into smaller pieces *(coming soon)*
- 🖥️ **Storage Nodes** — Distribute chunks across multiple nodes *(coming soon)*
- 🔄 **Replication** — Copy chunks for redundancy *(coming soon)*
- 📊 **Dashboard** — Frontend to manage files *(coming soon)*

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL 8.0 |
| Authentication | JWT + bcrypt |
| Validation | express-validator |
| Logging | Morgan + custom logger |

---

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MySQL](https://dev.mysql.com/downloads/mysql/) 8.0
- [Git](https://git-scm.com/)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/NottAstro/Distributed-File-System.git
cd Distributed-File-System
```

### 2. Switch to the development branch

```bash
git checkout dev
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up environment variables

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=distributed_fs
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
```

> 🔒 The `.env` file is gitignored and will never be pushed to GitHub.

### 5. Initialize the database

```bash
npm run db:init
```

### 6. Start the server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The server will start at **http://localhost:3000**.

---

## 📡 API Endpoints

### Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Server status |

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create a new account |
| POST | `/api/auth/login` | — | Login and get JWT token |
| GET | `/api/auth/profile` | 🔒 Bearer | Get current user profile |

### Request Examples

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","email":"john@example.com","password":"MyPass123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"MyPass123"}'
```

**Profile (protected):**
```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📂 Project Structure

```
Distributed-File-System/
├── server.js                          # Entry point — starts the server
├── .env.example                       # Environment variables template
├── package.json                       # Dependencies and scripts
│
├── server/
│   ├── app.js                         # Express app configuration
│   ├── config/
│   │   ├── index.js                   # Centralized config loader
│   │   └── db.js                      # MySQL connection pool
│   ├── controllers/
│   │   └── authController.js          # Auth request handlers
│   ├── middleware/
│   │   ├── authMiddleware.js          # JWT verification
│   │   └── errorHandler.js            # Global error handler
│   ├── models/
│   │   └── User.js                    # User database operations
│   ├── routes/
│   │   └── authRoutes.js              # Auth route definitions
│   ├── services/                      # Business logic (coming soon)
│   ├── storage/
│   │   ├── node1/                     # Storage node 1
│   │   ├── node2/                     # Storage node 2
│   │   └── node3/                     # Storage node 3
│   ├── uploads/                       # Temporary upload directory
│   ├── downloads/                     # Temporary download directory
│   └── utils/
│       └── logger.js                  # Colored console logger
│
├── database/
│   ├── schema.sql                     # Database schema (5 tables)
│   ├── seed.sql                       # Development seed data
│   └── init.js                        # Database initializer script
│
├── client/                            # Frontend (coming soon)
├── tests/                             # Test files (coming soon)
└── docs/
    └── architecture.md                # Architecture documentation
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Registered user accounts |
| `files` | Uploaded file metadata |
| `storage_nodes` | Available storage locations |
| `chunks` | Individual file pieces |
| `replicas` | Chunk copies for redundancy |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start server (production) |
| `npm run dev` | Start server with auto-restart (development) |
| `npm run db:init` | Create database, tables, and seed data |
| `npm test` | Run tests (coming soon) |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Branching strategy
- Commit message format
- Code style
- Pull request process

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
