# 🤝 Contributing to Distributed File System

Thank you for your interest in contributing! This guide will help you get started.

---

## 🌿 Branching Strategy

We use a **feature-branch workflow**:

```
main                          ← production-ready code
  └── dev                     ← integration branch (all features merge here)
        ├── feature/upload    ← feature branches
        ├── feature/chunking
        └── fix/login-bug     ← bug fix branches
```

### Rules

- ❌ **Never** commit directly to `main` or `dev`
- ✅ Always create a **feature branch** from `dev`
- ✅ Always create a **Pull Request** to merge into `dev`
- ✅ `dev` is merged into `main` only when stable

---

## 🔀 Workflow

### Starting a new feature

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

### Making changes

```bash
# Make your changes, then:
git add .
git status          # ⚠️ CHECK: .env must NOT appear here
git commit -m "feat: your descriptive commit message"
git push origin feature/your-feature-name
```

### Creating a Pull Request

1. Go to the repository on GitHub
2. Click **"Compare & pull request"**
3. Set **base branch** to `dev`
4. Write a clear title and description
5. Request a review
6. After approval, **merge** and **delete** the branch

---

## 📝 Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>
```

### Types

| Type | When to use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add file upload endpoint` |
| `fix` | Bug fix | `fix: handle null email in login` |
| `docs` | Documentation only | `docs: update API examples in README` |
| `refactor` | Code change (no new feature, no bug fix) | `refactor: extract validation to middleware` |
| `test` | Adding or updating tests | `test: add unit tests for User model` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `style` | Formatting (no code logic changes) | `style: fix indentation in authRoutes` |

### Examples

```
feat: implement file chunking with configurable chunk size
fix: prevent duplicate chunk index on concurrent uploads
docs: add database schema diagram to architecture docs
refactor: move JWT generation to shared utility
test: add integration tests for auth endpoints
```

---

## 🔒 Security Guidelines

> These are **mandatory**. Violations will block your PR.

1. **Never commit `.env`** — it contains real passwords and secrets
2. **Never hardcode secrets** — use `process.env` via the config loader
3. **Use parameterized queries** — always `pool.execute('SELECT * FROM users WHERE id = ?', [id])`, never string concatenation
4. **Hash passwords** — use `bcrypt`, never store plain text
5. **Validate input** — use `express-validator` on all route inputs
6. **Same error for wrong email/password** — prevents user enumeration

### Pre-push checklist

- [ ] `.env` not in `git status`?
- [ ] No hardcoded passwords or API keys?
- [ ] Used `pool.execute()` with `?` placeholders (not string concatenation)?
- [ ] Validated all user input?

---

## 💻 Code Style

### General

- Use **`const`** by default, `let` when reassignment is needed, never `var`
- Use **`async/await`** over callbacks or `.then()` chains
- Add **comments** for complex logic (not obvious code)
- Use **meaningful variable names** (`userId` not `x`)

### File naming

- Models: `PascalCase` — `User.js`, `FileMetadata.js`
- Everything else: `camelCase` — `authController.js`, `errorHandler.js`
- SQL files: `lowercase` — `schema.sql`, `seed.sql`

### Project structure

```
controllers/  → Handle HTTP requests, call models, send responses
models/       → Database operations (queries, inserts, updates)
middleware/   → Request processing (auth, validation, error handling)
routes/       → Route definitions and validation rules
services/     → Business logic (chunking, replication, etc.)
utils/        → Shared utilities (logger, helpers)
config/       → Configuration and database connection
```

---

## 🐛 Reporting Issues

1. Check if the issue already exists
2. Create a new issue with:
   - **Clear title**
   - **Steps to reproduce**
   - **Expected behavior**
   - **Actual behavior**
   - **Environment** (OS, Node version, MySQL version)

---

## 💡 Questions?

If you're unsure about anything, open an issue or reach out. Don't waste time guessing — ask!
