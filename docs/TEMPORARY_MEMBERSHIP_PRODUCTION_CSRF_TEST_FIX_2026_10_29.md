# Temporary membership production-environment test fix (2026-10-29)

## Observed failure

After clearing the stale configuration cache, six of seven tests passed. The final test, `test_temporary_membership_is_never_honored_in_production`, returned HTTP 419 instead of the expected 403.

## Root cause

The test uses `app()->detectEnvironment(fn () => 'production')` to verify that temporary Plus/Pro grants are disabled in production. Laravel no longer treats the subsequent POST as an HTTP request running in the `testing` environment. The framework's CSRF middleware correctly rejects a POST without a session CSRF token (419) before the controller can enforce the intended 403 guard.

## Narrowly scoped fix

Only `tests/Feature/Billing/TemporaryMembershipTest.php` was updated:

1. Capture the previous Laravel application environment.
2. Temporarily switch to production as before.
3. Send the second POST with a matching CSRF token in both the test session and request data, allowing the request to reach the controller's 403 guard.
4. Assert the production attempt does not change the temporary grant stored for the user.
5. Restore the original application environment inside a `finally` block, even if an assertion fails.

No production routes, CSRF middleware, controller, subscription logic, tables, migrations, or frontend files were modified.

## Verify on developer machine

```sh
php artisan config:clear
php artisan route:clear
php artisan test --filter=TemporaryMembershipTest
php artisan test --filter=PricingPageTest
```

If the focused tests pass, run the full test suite:

```sh
php artisan test
```

This source archive has no `vendor/` directory, so PHPUnit could not be executed in the packaging environment. `php -l` syntax validation and ZIP integrity were checked. The actual PHPUnit result must be confirmed locally.
