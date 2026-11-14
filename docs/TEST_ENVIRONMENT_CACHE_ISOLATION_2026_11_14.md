# PM Circle - Test Environment Isolation (2026-11-14)

## Observed failure

All Community tests stopped before assertions with `Tests require APP_ENV=testing`. The imported archive contained `bootstrap/cache/config.php` with `APP_ENV=local` and PostgreSQL settings. Laravel loaded that cache instead of PHPUnit testing configuration. This is a test-bootstrap issue; the output does not establish whether application assertions pass or fail.

## Correction

`phpunit.xml` forces `APP_ENV=testing`, uses a dedicated `APP_CONFIG_CACHE` path (`bootstrap/cache/config-testing.php`), and forces the test database environment to SQLite in-memory (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `DB_URL=`). The existing fail-fast guard in `tests/TestCase.php` remains intact. No production PHP code, routes, or database migrations are changed.

The corrected **distribution archive** omits generated bootstrap config/service/package caches, temporary sessions, logs, and devtools traces. This does **not** remove anything from your existing local installation.

## Commands on your Mac

```sh
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
php artisan config:clear
php -m | grep -i sqlite
APP_ENV=testing php artisan test --filter=EngagementStatsImplementationTest
APP_ENV=testing php artisan test --filter=PostEngagementContractTest
APP_ENV=testing php artisan test --filter=SlidingFeedTest
APP_ENV=testing php artisan test --filter=CommunityInlineCommentsTest
APP_ENV=testing php artisan test --filter=CommunityCommentReactionsTest
APP_ENV=testing php artisan test --filter=CommunityCommentMediaTest
```

`RefreshDatabase` can create and delete test tables. The forced in-memory SQLite database isolates the tests from your real PostgreSQL data. Do **not** replace it with the production PostgreSQL database. If your Mac's PHP lacks `pdo_sqlite`, install/enable it before running these test suites.

If the tests now reach assertions and fail, review that new output separately. For production-scale locking and concurrent reaction tests, use a separately provisioned PostgreSQL **testing** database, never your live database.

## Verification

XML syntax and file-level changes have been checked. End-to-end PHPUnit execution was not available in the packaging environment because the uploaded archive does not contain `vendor`.
