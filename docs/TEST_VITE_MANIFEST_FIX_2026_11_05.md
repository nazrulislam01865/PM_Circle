# PM Circle — Vite manifest isolation in Laravel feature tests

## Reported failure

`ProfileUpdateTest` and `ProfileEntryWorkflowTest` receive HTTP 500 while rendering the Inertia Blade root because `public/build/manifest.json` does not exist in the testing environment.

## Exact change

`tests/TestCase.php`: in `setUp()` immediately after `parent::setUp()`, call `$this->withoutVite();`.

Laravel's normal (non-test) Vite configuration, Blade root, frontend entrypoints, and asset build commands remain unchanged. This is a test-only configuration; it does not create a fake manifest or suppress missing assets in a deployed app.

This project uses a common `Tests\TestCase` parent for the affected feature tests. No individual test modifications or database migrations are necessary.

## Verification

Performed in the archive: `php -l tests/TestCase.php` passed. Source review found no feature tests asserting Vite assets. A full PHPUnit run was **not possible** here because the source archive does not include `vendor/autoload.php` / Composer dependencies.

On the developer machine, extract the patch into the Laravel root and run:

```bash
php artisan config:clear
php artisan test --filter=ResumeImportFlowTest
php artisan test --filter=ProfileUpdateTest
php artisan test --filter=ProfileEntryWorkflowTest
php artisan test
```

The tests should not require `npm run build` or a pre-existing `public/build/manifest.json`. If any other assertions fail, review the new failure independently rather than restoring a Vite dependency.

For the *running application* (outside tests), ensure the frontend is compiled with supported Node and `npm ci && npm run build`, or use the Vite dev server as configured by the project. `withoutVite()` has no effect on normal HTTP requests.

## Package hygiene

The full source package excludes runtime logs, sessions, cached Blade views, testing uploads, locally uploaded resumes and avatars, Inertia devtools traces, and `__MACOSX` metadata. Preserve these separately from your local application if needed; they should not be deployed as source code.
