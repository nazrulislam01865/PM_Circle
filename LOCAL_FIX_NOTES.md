# PM Circle — Laravel storage and signup test-environment fixes

This repair preserves the signup UI and all three existing signup email modes.
No database migration, query, route, or frontend component is changed.

## Root causes

1. The uploaded project was missing `storage/framework/views/`, which Laravel needs
   to compile the Inertia root Blade view. This caused HTTP 500 responses with
   `Please provide a valid cache path` and may also interrupt Wayfinder's Artisan
   route-generation command during frontend builds.
2. Local `.env` values such as `PMC_SIGNUP_VERIFICATION_MODE=fixed` could carry
   into the testing process. Tests that expect a sent mailable then failed.
3. The local log shows Node v20.20.2, but the installed `vitest` package requires
   Node >=22.12 (or Node 24 / 26+).

## Minimal changes

- Added tracked `.gitignore` placeholders for `storage/framework/views`,
  `storage/framework/sessions`, and `storage/framework/cache/data`.
- Restored a project root `.gitignore` to protect credentials and generated files.
- Updated `phpunit.xml` to explicitly select real email verification for tests.
- Updated `tests/TestCase.php` to make normal email verification the default for
  tests; the existing fixed/off tests override this setting deliberately.
- Removed previously generated `bootstrap/cache/*.php` and application logs from
  this DISTRIBUTION ZIP; they are local runtime artifacts, not project sources.

## Local verification commands (inside your existing repository)

Use Node 22.12+ (prefer an up-to-date Node 22 LTS or 24 LTS).
If nvm is installed, run `nvm install 22` and `nvm use 22` first.

```bash
composer install
npm ci
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan wayfinder:generate --skip-database --with-form
npm run build
npm run types:check
php artisan test --filter=SignupVerificationModesTest
php artisan test --filter=SignupEmailCodeTest
php artisan test
php artisan serve
```

The ZIP contains the required directories, but if an extraction tool drops hidden
`.gitignore` files, recreate the directories before running Artisan:

```bash
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views
```

To try the local default verification code, keep these in your existing `.env`:

```dotenv
APP_ENV=local
PMC_SIGNUP_VERIFICATION_MODE=fixed
```

Run `php artisan config:clear` after changing `.env`. This is only a local/test
shortcut. Production always enforces normal email verification.

No database migrations are required for this fix. Do not use `migrate:fresh`.

## Verification performed in the packaging environment

- All 127 PHP files under app/bootstrap/config/database/routes/tests passed `php -l`.
- `phpunit.xml` parsed successfully with the email mode forced for tests.
- Required storage placeholder directories and files were checked.
- Full Laravel tests / Wayfinder generation / Vite build not executed here:
  uploaded archive omits `vendor`, and Composer + PHP extensions are unavailable.
