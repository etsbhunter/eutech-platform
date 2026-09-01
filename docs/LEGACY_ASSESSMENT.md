# Legacy Assessment

Assessment of the four existing read-only source directories, performed before any code was written in this repository. All four remained completely unmodified throughout.

## clinic-platform

- **Purpose**: the clinic-management product Eutech sells and provisions.
- **Stack**: pnpm/Turborepo monorepo — NestJS 11 + Prisma 6.10 on PostgreSQL (backend), Next.js/React (frontend and a separate patient-queue-display app). Node pinned `>=24 <25`. JWT access tokens + rotated refresh-token cookies, argon2 password hashing.
- **Git**: repo, branch `tcm-clinic-v1`, clean working tree.
- **Tenancy**: row-level multi-tenancy in a shared Postgres database. `Clinic` is the tenant root; nearly every domain table carries `clinicId`. Every request is scoped by an `x-clinic-id` header, re-validated server-side against a real `ClinicMembership` row.
- **Reusable capabilities for Eutech's integration**: `GET /api/v1/health` (DB liveness, not clinic-scoped, no clinical data), `GET /api/v1/clinics/me` (read-only, caller's own clinic).
- **Gaps relevant to Eutech**: no clinic-provisioning API exists (only a dev `seed.ts` and direct Prisma writes in tests create a `Clinic`); no plan/license/entitlement concept anywhere in the schema; the frontend hard-assumes one clinic per user (`clinics[0]`, no switcher); a `CLINIC_MANAGE` permission is declared in the catalog but enforced nowhere.
- **Self-reported status**: `docs/IMPLEMENTATION_STATUS.md` calls the build "an MVP, not a production approval," with billing/insurance/appointments/telemedicine explicitly out of scope.

## nextleap-backend

- **Purpose**: old Laravel/Sanctum backend prototype for the defunct NextLeap course-checkout product.
- **Stack**: Laravel 12, PHP 8.2, Sanctum 4.1 — current, reasonable versions.
- **Git**: no `.git` — no history exists to preserve.
- **Reusable**: `composer.json` dependency baseline, stock `config/sanctum.php`, PHPUnit scaffolding.
- **Excluded (not production-ready)**: `AuthController` password policy (`min:6`, no complexity rule); `bootstrap/app.php` aliases `auth:sanctum` to `EnsureFrontendRequestsAreStateful`, which does not enforce authentication — a broken guard, not a pattern to copy; `WebhookController` has no signature verification and is not idempotent; `Lead` is an untyped, email-matched "payment source of truth" with no order/amount/plan; registration failures log the full raw request body (including plaintext password) to `storage/logs/laravel.log`; login logs the raw CSRF token.
- **Disposition**: not used. Eutech's backend became NestJS/Prisma (see `ARCHITECTURE.md`), so no Laravel code was carried forward — only the lessons above.

## nextleap-frontend

- **Purpose**: old Vue 3/Vite/Tailwind commercial frontend prototype for the same defunct product.
- **Stack**: Vue 3.5, Vite 6, Vue Router 4.5, Pinia 3, Axios 1.9, vue-i18n 9.14, Tailwind 3.3 — current versions.
- **Git**: no `.git`.
- **Excluded (not production-ready)**: single-page anchor-scroll landing structure; orange/purple branding hardcoded as literal Tailwind utility classes; `starter`/`pro` plan baked into query-string parsing in `Login.vue`/`Signup.vue`; two `alert()` calls for error handling; CSRF token and `document.cookie` logged to the browser console in `auth.js`; duplicated axios/CSRF setup across two files; a stray unrelated HTML file sitting inside `src/locales/`; a prior Vite build committed into `public/dist/`.
- **Disposition**: not used. Eutech's frontend became Next.js/React (see `ARCHITECTURE.md`). The pricing-tier/feature-grid *layout concept* (3-column grid, emphasized middle tier, disabled "coming soon" card) was reused conceptually in `frontend/src/app/[locale]/pricing/PricingContent.tsx`, rebuilt from scratch with Eutech content and the green/white palette.

## nextleap

- **Purpose**: old static-site experiment for the same defunct product.
- **Contents**: a single `index.html` using Tailwind via CDN and the AOS scroll-animation library, no build tooling, no `.git`.
- **Disposition**: not used for code. Section-layout ideas (sticky header, hero with benefit bullets, 3-column pricing/feature grids, About page Vision/Mission/Values grid) informed the shape of the Phase 1 marketing pages, rebuilt with Eutech copy and branding.

## Sensitive/runtime files observed (paths only, never read)

`clinic-platform`: `.env`, `.env.example` (tracked), `.env.test`, per-app `.env.local`/`.env.test`, dev log files, `.turbo/` caches — all gitignored except `.env.example`.
`nextleap-backend`: `.env`, `.env.example`, `database/database.sqlite`, `storage/logs/laravel.log`, compiled Blade view cache — no git repo, so no tracked/untracked distinction applies.
`nextleap-frontend`: a single `.env` file — no git repo; note that `.gitignore` in that prototype does not explicitly ignore `.env` (only `*.local`), which is why `eutech-platform/.gitignore` explicitly ignores `.env`/`.env.*`.

None of the above were opened, copied, or reproduced anywhere in `eutech-platform`.
