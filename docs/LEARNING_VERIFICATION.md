# Learning update verification

- PHP syntax: **69 files** in relevant application, routes, migrations, seeders and learning tests passed `php -l`.
- Frontend syntax: TypeScript transpile syntax checks and local-import resolution passed across the learning files, shared member chrome, dashboard components, and referenced types (**49 local imports**, 0 broken).
- PostgreSQL migration / PHPUnit tests: **not executed**; `pdo_pgsql` unavailable and Composer/vendor absent from the upload.
- Production frontend build and strict type-check: **not executed**; uploaded source has neither `node_modules` nor an npm lockfile. Running `npm ci` is unsupported; run `npm install` (or the repository's approved package manager) in the destination environment.
- Visual browser QA at reference dimensions: **not executed**. A live browser, installed deps and running database are needed.
- New tests are authored in `tests/Feature/Learning/LearningFlowTest.php` but must still be run after installation.

Run on a clean local/staging database before signoff:

```bash
php artisan migrate
php artisan db:seed
php artisan test --filter=LearningFlowTest
npm install
npm run types:check
npm run build
```

Check 1280px/desktop, tablet, 360px/mobile, keyboard focus, menu drawer, progress, persistence and regression of `/dashboard`, `/`, `/register`, and `/community`.
