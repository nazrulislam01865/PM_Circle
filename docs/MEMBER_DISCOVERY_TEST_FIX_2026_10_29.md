# PM Circle — MemberDiscoveryTest regression repair (29 October 2026)

## Reported local verification

- `npm run build`: **PASS**, 5.30 seconds. Rolldown plugin timings are diagnostics, not a build failure.
- `php artisan test --filter=MemberDiscoveryTest`: **2 pass / 2 fail** before this repair.
  - Follow test returned `403` instead of a redirect.
  - Saved Posts was not an Inertia response (same onboarding status guard).

## Root cause

The users migration `2026_10_29_000001_create_pm_circle_core_tables.php` declares `users.status` default `active` and `users.onboarding_step` default `1`. `UserFactory::definition()` originally omitted both columns. When a factory-created user was immediately passed to `$this->actingAs($user)`, the in-memory model could lack the database-generated `status` attribute, even though the database row had the default. `EnsureOnboarded` intentionally checks `$request->user()->status === 'active'`, returning HTTP 403 for the stale model attribute.

## Exact changes

- `database/factories/UserFactory.php`: initialize `status => active` and `onboarding_step => 1` in the factory, matching migration defaults. No production middleware or authorization changes.
- `tests/Feature/Members/MemberDiscoveryTest.php`: add checks for factory state and that suspended members are forbidden from following or viewing saved posts. Existing failing scenarios remain unchanged.

## Data, security and design impact

- No schema changes, migrations, environment changes, CSS, TypeScript, or user-interface edits.
- No change to real user creation or password hashing.
- Suspended or restricted members remain blocked by the backend.

## Local verification steps

```bash
php artisan test --filter=MemberDiscoveryTest
php artisan test
```

Optional: `npm run build` if you want to verify the unchanged frontend.

## What was verified here

- `php -l database/factories/UserFactory.php`: PASS.
- `php -l tests/Feature/Members/MemberDiscoveryTest.php`: PASS.
- Source review of factory, migration, onboarding middleware, member routes and Saved Posts controller.
- ZIP integrity and required files (after packaging): PASS.

## Outstanding verification

This environment does not contain the project's Composer `vendor/` dependencies, a `composer` executable, or PDO SQLite/PostgreSQL drivers, so PHP feature tests cannot be executed in this container. The updated tests must be run in the local Laravel installation before considering them passed.
