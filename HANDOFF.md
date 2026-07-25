# PVPROD — Developer Handoff

Production Management System for tracking exhibition/event projects through their
lifecycle (pre-loading → loading-in → loading-out → completed), with photo
documentation, checklists, roles, and an audit log.

> ⚠️ **Read this before SPEC.md.** SPEC.md describes the *original* design
> (single HTML file + LocalStorage). The app has since moved to a **Node/Express +
> SQLite backend**. SPEC.md is still valid for the *business/workflow* rules and
> deployment rules, but NOT for the technical architecture. This file is the SOT
> for architecture.

---

## 1. Stack & Architecture

- **Backend:** Node.js + Express 5, single file [server.js](server.js) (~840 lines). Plain REST JSON API.
- **Database:** SQLite via `better-sqlite3`, file `pvprod.db` (synchronous, no ORM, raw SQL prepared statements).
- **Frontend:** ONE file [index.html](index.html) (~125 KB) — vanilla JS, embedded CSS/JS, no build step, no framework. Served as static file.
- **File uploads:** `multer`, saved to `uploads/` on disk (NOT base64/DB despite what SPEC.md says). 10 MB/file limit, max 20 files/upload. Served at `/uploads/<filename>`.
- **No build/bundler/TypeScript.** Edit files directly.

There is no framework, no migrations tool, no test suite. Tables are auto-created
on startup with `CREATE TABLE IF NOT EXISTS` in [server.js](server.js) (~line 47).

## 2. Run Locally

```bash
npm install
npm start                 # node server.js — defaults to PORT 3000
# or: node server.js 3001 (port via argv[2] or PORT env)
```
Open http://localhost:3000. DB file `pvprod.db` is created + seeded with sample
data on first run if empty.

## 3. Auth model — IMPORTANT (this is weak, know before extending)

- Login is `POST /api/auth/login` → returns the user object (minus password).
- **There is NO session, NO token, NO JWT.** The frontend just stores the returned
  user in `localStorage` under key `pvprod_user`. All other API endpoints are
  **unauthenticated / unprotected** — anyone who can reach the API can call them.
- Passwords hashed with plain **SHA-256, no salt** (`hashPassword` in server.js). Not production-grade.
- Roles: `admin`, `head`, `manager`, `user` (see permission matrix in SPEC.md).
  **Role enforcement is client-side only** in index.html; the server does not check roles.
- New self-registered users get `status: 'pending'` and must be approved by an
  admin/manager before they can log in (`/api/auth/approve/:id`).

**If you harden anything, start here:** add server-side auth middleware + role checks, salted hashing (bcrypt), and real sessions/JWT.

### Default seed credentials (password for ALL seeded users: `pvprod123`)
- `admin@pvprod.com` (admin), `head@pvprod.com` (head), `manager@pvprod.com` (manager), `user@pvprod.com` (user), plus several named sample users.

## 4. Database schema (tables in server.js ~L47–126)

- **divisions** (id, name, created_at) — seeded: Exhibition, Event, Installation, Stage Design, Audio Visual.
- **users** (id, name, email UNIQUE, phone, password, role, status, division_id→divisions, avatar, created_at).
- **projects** (id, name, client, vendor, location, division_id, start_date, end_date, status, created_by→users, created_at). status ∈ pre-loading | loading-in | loading-out | completed.
- **photos** (id, project_id→projects CASCADE, **type**, filename, filepath, note, created_at). `type` string groups photos by workflow step (e.g. survey, design, drawing, workshop, marking, installation, dismantle…). Files live on disk in `uploads/`.
- **checklist_items** (id, project_id CASCADE, **type**, text, checked 0/1, created_at). `type` ∈ loadingIn | dismantle | finalVerify | etc.
- **project_members** (project_id, user_id, UNIQUE pair) — extra users assigned to a project.
- **audit_logs** (user_id, user_name, action, entity_type, entity_name, details, created_at) — written via `logAudit(...)` helper.

## 5. API surface (all under `/api`, defined in server.js)

- Divisions: GET/POST/PUT/DELETE `/api/divisions[/:id]`
- Users: GET/POST/PUT/DELETE `/api/users[/:id]`, PUT `/api/users/:id/settings`, PUT `/api/users/:id/status`
- Projects: GET/POST `/api/projects`, GET/PUT/DELETE `/api/projects/:id`, PUT `/api/projects/:id/status`
- Photos: POST `/api/projects/:id/photos` (multipart, field `files`, ≤20), PUT/DELETE `/api/photos/:id`
- Checklist: POST `/api/projects/:id/checklist`, PUT/DELETE `/api/checklist/:id`
- Members: GET/POST `/api/projects/:id/members`, DELETE `/api/projects/:id/members/:userId`
- Audit: GET `/api/audit` (paginated)
- Admin: GET/DELETE `/api/admin/orphaned-files` (cleanup of uploads with no DB row)
- Auth: POST `/api/auth/login`, `/api/auth/register`, GET `/api/auth/pending`, POST `/api/auth/approve/:id`, `/api/auth/reject/:id`
- Stats: GET `/api/stats` (dashboard counters)
- Frontend `const API = ''` (same-origin relative calls).

## 6. Deployment — SOT rules (see SPEC.md §Deployment + .clinerules/)

**Golden rules:**
- **App code SOT = GitHub.** **Data SOT = the VPS database.** Never overwrite the VPS DB with a local dev DB.
- Keep **local, GitHub, and VPS on the same commit.** If they diverge, stop and report the mismatch (per `.clinerules/sot-deployment-rules.md`).
- Exclude `*.db` from deploy tarballs. Backup the VPS DB before any schema change.
- Do not disrupt other apps/services on the VPS.

**VPS:**
- Path: **`/opt/pvprod`** (NOT `/var/www/pvprod`)
- Process manager: **PM2**, app name `pvprod`, port **3001**
- Deploy flow: SSH in → `cd /opt/pvprod && git pull origin master && pm2 restart pvprod` → verify commit matches GitHub.
- Port map on VPS: 3001 PVPROD · 3003 Budget · 3005 PMPV · 3006 Prompt (avoid conflicts).
- **Host IP, SSH key, and full deploy commands are in `DEPLOY.local.md`** (repo root, **gitignored — not committed**). Ask the project owner if you don't have it.

**Repo:** https://github.com/kopipes/pvprod.git — default branch `master`.

## 7. Gotchas / things to know

- `pvprod.db` is committed in the local repo but the VPS keeps its own live DB — do not push a local DB over it.
- No env/config files; port is the only runtime option (`PORT` env or first CLI arg).
- No migrations: to change schema, edit the `CREATE TABLE` block AND write a one-off `ALTER TABLE` (existing DBs won't pick up new columns automatically). Backup VPS DB first.
- CORS is wide open (`app.use(cors())`).
- Uploaded files can be orphaned if a photo row is deleted without the file — hence the `/api/admin/orphaned-files` cleanup endpoint.
- Everything (UI, styling, all client logic) is in the single `index.html` — search within it rather than expecting multiple JS files.

## 8. Suggested next steps for whoever continues

1. Add real server-side authentication + per-role authorization on every route.
2. Replace unsalted SHA-256 with bcrypt/argon2; add password reset.
3. Introduce a migration mechanism before further schema changes.
4. Update/retire SPEC.md's "Technical Approach" section so it matches reality.
5. Consider splitting `index.html` into modules if the frontend keeps growing.

---
*Current version: package.json `1.0.0`. Latest commit at handoff: see `git log`.
Local, GitHub, and VPS were all in sync at handoff time.*
