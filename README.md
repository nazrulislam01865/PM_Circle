# PM Circle by ITQAN

A Laravel 13 modular-monolith **foundation / initial community beta**, based on the supplied SRS and reference screens. Not a finished production build. See `docs/IMPLEMENTATION_STATUS.md` for delivered and outstanding scope.

## Member sidebar and password update (29 October 2026)

- Dashboard, Learn & Practice and other signed-in pages now share the same **264px member sidebar and 67px header** at desktop width, using the central CSS variables in `pm-dashboard-shell.css`. Navigation never scrolls horizontally; mobile navigation opens without horizontal sliding.
- Signup requires **8 or more characters** (frontend and Laravel validation); new passwords are stored as one-way **bcrypt hashes**, never plaintext or reversible encryption.
- This source archive intentionally excludes outdated built assets and private sessions. Run `npm install && npm run build` or `npm run dev` after updating.
- See `docs/SIDEBAR_PASSWORD_FIX.md` and `docs/SIDEBAR_PASSWORD_VERIFICATION.md`.

## Stack
Laravel 13, PHP 8.4+, Inertia 3, React 19, TypeScript, Tailwind 4, shadcn/ui, PostgreSQL, Redis. Dependencies for Horizon/Reverb, Filament and production AI/payment adapters are *not yet installed*.

## Local setup (macOS)

1. Install PHP 8.4 with extensions (including `pdo_pgsql`, `redis`, `fileinfo`, `mbstring`, `openssl`, `intl`), Composer, Node.js LTS, PostgreSQL and Redis. Optionally run `PM_DB_PASSWORD='your-local-db-password' docker compose up -d` for the DB/Redis containers.
2. From this folder, run `composer install` then `cp .env.example .env` and configure PostgreSQL database credentials; ensure `PM_DB_PASSWORD` matches the local container password if using Compose.
3. Run `php artisan key:generate`, `php artisan migrate`, and **`php artisan db:seed`** for plans and the local sample scenario.
4. Run `npm install`, `npm run build` or `npm run dev`; launch `php artisan serve` in a separate terminal.
5. Open `http://localhost:8000`. For email verification in local development, `MAIL_MAILER=log` writes verification links to `storage/logs/laravel.log`; configure a verified SMTP provider before production.

## Verification / limitations

Use `php artisan test` and `npm run types:check` after installing dependencies. CI-style checks, database tests and browser snapshot tests need a full environment. Do not copy a development `.env` or SQLite database to production. Private resume files are stored on the **local quarantine directory under storage/app/private** until scanner integration is completed. PostgreSQL and S3 must be configured before deployment.

## Prototype-alignment revision (29 October 2026)

- The public and member page containers now expand to **1480px** on large screens, retaining two columns and responsive smaller layouts. Login and all three signup screen widths are unchanged.
- Restored the supplied homepage's scenario response preview, community tabs, opportunity rows, member cards, four capability cards and end-of-page invitation.
- Restored the supplied member post's author card, action bar, nested comment thread, guidelines, related posts and bottom invitation.
- Demo members, posts and scenario responses are seeded **only in local/testing environments** by `DatabaseSeeder` (idempotently). Illustrative homepage metrics and AI scores are **visual mockups, not live participation or actual AI grading**. No demo accounts use shared passwords. The demo portrait crops originate from the supplied prototype screenshots.
- Email verification is **temporarily optional** when `PMC_EMAIL_VERIFICATION_REQUIRED=false` (default in this local foundation). `User::hasVerifiedEmail()` grants bypass access without setting `email_verified_at`, and sending verification email is suppressed. Registration still requires a unique email, 8-character password and legal consent. Set `PMC_EMAIL_VERIFICATION_REQUIRED=true` and validate the full verification flow before production release.
- To show the seeded prototype: run `php artisan migrate` followed by `php artisan db:seed`. Existing production data should never be reseeded with sample users. No production payment activation is available.

## Member dashboard (three approved references)

The member dashboard at `/dashboard` now uses the approved blue Free, Premium, and Pro layouts in a dedicated responsive component system. The original public, login and onboarding designs were not changed. It is backed by a read-only Laravel dashboard query and the existing authenticated community post/reaction/save routes.

For **local screenshot previews only**, finish onboarding for a local account and use `/dashboard?demo_plan=free`, `/dashboard?demo_plan=premium` or `/dashboard?demo_plan=pro`. This requires `APP_ENV=local` and `PMC_DEMO_CONTENT_ENABLED=true`. These query parameters only affect visual demo states; they never enable paid entitlements. `php artisan db:seed` includes idempotent sample posts for the two dashboard feed cards. Learning metrics, profile views and AI credits are demonstration values, not real analytics. The remaining exam/AI/career destinations are explicitly marked as not yet implemented.

See **`docs/DASHBOARD_IMPLEMENTATION.md`** for the complete file map, security limits and verification steps. After updating this project, run `php artisan migrate` and `php artisan db:seed` on a **local or testing database only**, then run `npm install && npm run build` so the new dashboard code replaces any prior compiled assets. Existing production users/data must not be seeded with demo profiles.

## Learn & practice: connected learning screens

The learning catalogue, path roadmap and module activity flow now follow the three supplied learning screenshots. The learning implementation uses the existing member sidebar/header and isolated shared CSS classes. The first module includes the exact introductory MCQ examples; remaining modules are local demo curriculum. Learning answers and completed steps are stored in PostgreSQL. No real AI assistant or certificate issuance is implied. Refer to `docs/LEARNING_IMPLEMENTATION.md` and `docs/LEARNING_VERIFICATION.md`. Run `php artisan migrate` then `php artisan db:seed` only on a local/testing database; rebuild frontend assets (`npm install && npm run build`) after extracting this ZIP.

## One authenticated sidebar + local Plus/Pro access (29 October 2026)

The Inertia layout resolver now avoids the Laravel starter sidebar around `learning/*` pages. Dashboard, Learning, Community, Settings and other logged-in PM Circle pages use one `MemberDashboardLayout`; login and signup remain unchanged. Sidebar collapse preference survives navigation.

For **local development/testing only**, the project also supports switching Free / Plus / Pro without payment processing. Add the following to the local `.env`, then run a non-destructive migration:

```ini
APP_ENV=local
PMC_TEMPORARY_PAID_ACCESS_ENABLED=true
PMC_PAYMENTS_ENABLED=false
```

```bash
php artisan migrate
php artisan db:seed --class=PlanSeeder
php artisan optimize:clear
npm install
npm run build
```

Already-onboarded members can open **`/membership`** or use **Compare plans / Manage plan** at the bottom of the PM Circle sidebar and activate a test plan. New members can choose Plus or Pro on registration Step 3. The application checks this grant server-side for learning access and dashboard status; it does not create a paid subscription, charge money, or issue AI credits. In `APP_ENV=production`, all temporary grants are ignored and the activation endpoint refuses requests, regardless of its flag. To revoke locally, select Free at `/membership` or set `PMC_TEMPORARY_PAID_ACCESS_ENABLED=false` and clear configuration.

See `docs/SIDEBAR_MEMBERSHIP_FIX_2026_10_29.md` for affected files, migration, and verification steps. **Do not replace an existing local `.env` with the example file; retain your established DB credentials.**

## Screen audit and prototype reconciliation (29 October 2026)

See `docs/SCREEN_AUDIT_2026_10_29.md` for a numbered, screenshot-to-page inventory of **all 14 supplied design references** (reference images in `docs/reference-screens/`). The missing feature-comparison pricing screen and working member-directory and saved-post screens have been added. Notifications, achievements and profile insights now have dedicated, truthful account pages; later-phase feature engines are still unimplemented. Do not treat a React page as proof of production readiness. One new additive migration (`2026_10_29_000005_create_member_follows.php`) is required. Keep your existing `.env` and database and run `php artisan migrate`, not `migrate:fresh`.
