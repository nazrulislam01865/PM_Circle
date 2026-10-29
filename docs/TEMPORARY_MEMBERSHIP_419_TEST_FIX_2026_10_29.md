# Temporary membership tests: 419 resolution (2026-10-29)

## Root cause

The imported archive contained `bootstrap/cache/config.php`, generated on a developer's computer using `APP_ENV=local`, `DB_CONNECTION=pgsql`, and `SESSION_DRIVER=file`. Cached configuration overrides the `testing` overrides in `phpunit.xml`. As a result, Laravel 13 handled POST requests as normal web requests and returned `419` because test HTTP requests do not send a CSRF token. Read-only GET pricing tests passed despite the configuration mismatch.

## Resolution

- Removed generated bootstrap cache files (`config.php`, `routes-v7.php`, `events.php`, `packages.php`, and `services.php`) from the delivered project. Keep only the existing `bootstrap/cache/.gitignore`.
- Excluded developer-specific runtime sessions, cached views, disk-cache entries, and Inertia devtools traces from the delivered archive. These are not application source files.
- Added a fail-fast environment check to `tests/TestCase.php` that stops test execution with a clear `config:clear` instruction if PHPUnit loads a cached non-testing environment. This also reduces the risk of migrations or `RefreshDatabase` acting on the developer's PostgreSQL database by mistake.
- No application route, production middleware, CSRF checks, billing action, price catalog, database migration, or subscription logic was modified.

## Run locally on macOS

```sh
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
php artisan config:clear
php artisan route:clear
php artisan test --filter=TemporaryMembershipTest
php artisan test --filter=PricingPageTest
```

`php artisan optimize:clear` is optional if you also want to clear views and application cache; `config:clear` is sufficient to fix this issue. Do not run `php artisan config:cache` on a development machine before testing. In production, generate configuration cache on the server, after setting the correct server environment, never distribute cached files from a development computer.

## Verification in provided environment

- Checked the supplied cached config: it used `local` / PostgreSQL / file sessions, while `phpunit.xml` specifies `testing` / in-memory SQLite / array sessions.
- Validated the modified PHP syntax with `php -l`.
- Confirmed generated bootstrap PHP caches are absent from the updated package.
- Full PHPUnit execution was unavailable because the uploaded ZIP did not contain `vendor` and the current execution environment has no Composer installation; do not treat this as a completed PHPUnit pass.
