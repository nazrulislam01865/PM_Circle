# Sidebar + registration password: verification report

## Completed checks in the authoring environment

- PHP syntax: **106** PHP files under `app`, `config`, `database`, `routes`, and `tests` passed `php -l`.
- Frontend syntax/local imports: **227** JavaScript/TypeScript files transpiled and **471** source-local imports resolved with the globally installed TypeScript tool. (Declaration files were not transpiled; full type checking requires dependencies.)
- CSS browser geometry: Playwright + Chromium tested a shared-shell DOM fixture containing the actual dashboard and learning CSS at **1700, 1240, 1100, 950, 700, 600 and 375px**. Both page variants had identical sidebar and header dimensions. At widths >=1100px sidebar=264px, at 700-950px sidebar=80px, header=67px at all widths. No horizontal overflow occurred in the fixture.
- PHP's native bcrypt runtime: `password_hash(..., PASSWORD_BCRYPT)` returned the `bcrypt` algorithm and `password_verify` succeeded.
- Static checks confirm registration enforces `Password::min(8)`, calls `Hash::driver('bcrypt')->make` and the User model retains its `hashed` cast. Added feature tests check seven characters rejected and bcrypt hash produced for eight characters.

## Not executed

- `npm run build` could not execute: the source ZIP includes no `node_modules` and `vp` is not installed (`vp: not found`).
- `php artisan test` could not execute: `vendor/autoload.php` is absent; the PHP environment also lacks PostgreSQL/SQLite PDO drivers.
- Real Inertia/Laravel screenshot matching and integration tests are still required on the user's configured local machine.

## Recommended post-install verification

1. Keep the existing application's `.env` file and database. Back up first. Do not use `migrate:fresh`.
2. Run `composer install`, `npm install`, `npm run build`, and `php artisan optimize:clear`.
3. Run `php artisan test --filter=RegistrationPasswordSecurityTest` with a separate test database; run the existing suite afterward.
4. Check `/dashboard`, `/learning`, a learning path, and an activity at the same desktop width. Compare sidebar and top header geometry without switching browser zoom.
5. Test narrow desktop, tablet and mobile; make sure long item labels truncate without horizontal scrolling, and mobile menu opens using the close button.
6. Register with seven characters (must show an error) and with eight characters (may succeed subject to other validation). Verify the saved hash begins `$2y$` and `Hash::check` succeeds. Do not expose hashes in browser responses or logs.

The learning-activity content and existing design are not intentionally changed. Existing stored passwords are untouched; the bcrypt-only policy concerns newly stored credentials, with legacy-hash compatibility requiring review if a previous deployment used a different driver.
