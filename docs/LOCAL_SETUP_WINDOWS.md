# Local Setup (Windows / Laragon)

## Prerequisites

- Node.js 22+ (verified against Node 22.12.0)
- pnpm 10+ (`pnpm@10.34.5` pinned in the root `package.json`)
- PostgreSQL running locally (Laragon's bundled PostgreSQL works — verified against it)
- No C++ build toolchain (Visual Studio Build Tools) is required. Password hashing intentionally uses Node's built-in `crypto.scrypt` instead of argon2, specifically to avoid needing node-gyp/a native compiler on Windows dev machines — see `docs/ARCHITECTURE.md`.

## Database

This repository uses its own isolated PostgreSQL role and databases, separate from `clinic-platform`'s:

```sql
CREATE ROLE eutech_user LOGIN PASSWORD 'eutech_dev_password' CREATEDB;
CREATE DATABASE eutech_platform OWNER eutech_user;
CREATE DATABASE eutech_platform_test OWNER eutech_user;
```

(`CREATEDB` is required so Prisma can create its shadow database during `prisma migrate dev`.)

## Backend

```bash
cd backend
cp .env.example .env    # then edit DATABASE_URL / secrets for your machine
pnpm install             # from the repo root, installs all workspace packages
pnpm exec prisma migrate dev
pnpm dev                 # nest start --watch, listens on PORT (default 3001)
```

Verify: `curl http://localhost:3001/api/v1/health` should return `{"status":"ok","database":"up",...}`.

### Seed data

```bash
pnpm exec prisma db seed
```

Seeds the Eutech Clinic product/plan/price/feature catalogue (placeholder pricing) and one local-dev-only Eutech Admin account: `admin@eutech.internal` / `EutechAdmin123!` (mirrors clinic-platform's own documented demo-credential pattern — never treat this as a real credential, and never run this seed against anything but a local/dev database).

## Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm dev                 # next dev, listens on port 3000
```

Verify: `http://localhost:3000` should redirect to `/en`; `http://localhost:3000/zh` should render the Simplified Chinese landing page.

## Running both together

From the repo root: `pnpm dev` (Turborepo runs both dev servers). Make sure the backend is reachable at the URL configured in `frontend/.env.local`'s `NEXT_PUBLIC_API_URL`.

## Troubleshooting

- **`nest build` silently produces no `dist/` output**: this happened once during development because `tsconfig.tsbuildinfo` ended up at the repo root instead of inside `dist/`, and a stale copy tricked TypeScript's incremental compiler into thinking nothing needed rebuilding even after `dist/` was deleted. Fixed permanently by setting `"tsBuildInfoFile": "./dist/tsconfig.tsbuildinfo"` in `backend/tsconfig.json` (so `deleteOutDir` always clears it too) — if this ever resurfaces, delete any stray `*.tsbuildinfo` outside `dist/` and rebuild.
- **`prisma migrate dev` refuses to run ("non-interactive environment")**: this happens in a plain shell/CI context whenever the migration needs a confirmation prompt (e.g. adding a `UNIQUE` constraint). Work around it by writing the migration SQL by hand into a new `prisma/migrations/<timestamp>_<name>/migration.sql` file and applying it with `prisma migrate deploy`, which doesn't prompt.

## Verification commands (also used as this repository's acceptance checks)

```bash
# Backend
cd backend && pnpm exec eslint "src/**/*.ts" && pnpm exec jest && pnpm exec nest build

# Frontend
cd frontend && pnpm exec eslint . && pnpm exec next build
```
