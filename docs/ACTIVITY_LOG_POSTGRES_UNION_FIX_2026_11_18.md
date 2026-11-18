# PM Circle Activity Log - PostgreSQL UNION type fix (18 November 2026)

## Reported error

Following **Community contribution > View activity** successfully routed to `GET /activity-log`, but the activity timeline failed with PostgreSQL error `SQLSTATE[42804]`: `UNION types text and smallint cannot be matched`.

## Verified root cause

`app/Domain/Activity/Queries/MemberActivityFeed.php` combines existing activity sources with `UNION ALL`. The `detail` slot contains text titles for community and learning activity. The exam branch selected `pmp_exam_attempts.mode` as `detail` without converting its SQL type. In the affected database PostgreSQL reports `mode` as `smallint`. The project migration `2026_11_16_000004_create_pmp_exam_settings.php` defines `mode` as string: the existing database schema therefore differs from the checked-in migration, and no automatic schema changes were made.

## Fix

- Cast the exam branch `mode` to text using portable `CAST(mode AS TEXT) AS detail`, preserving the union schema and its query count.
- Preserve `focused` and `full` display labels. For unrecognized numeric/legacy values use a neutral `PMP exam attempt` label rather than misidentifying a focused attempt as a full mock.
- Add feature regressions that combine a completed exam attempt and a published post and handle an unrecognized numeric mode.
- No route, navigation, CSS, authorization, table, index, or migration changed.

## Affected files

1. `app/Domain/Activity/Queries/MemberActivityFeed.php` - normalized UNION column and safe display label.
2. `tests/Feature/Activity/MemberActivityLogTest.php` - additional mixed-source and numeric-mode tests.
3. This document.

## Verification in this environment

- `php -l app/Domain/Activity/Queries/MemberActivityFeed.php` - passed.
- `php -l tests/Feature/Activity/MemberActivityLogTest.php` - passed.
- `node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs` - 6/6 passed.
- Full Laravel feature tests could not run: uploaded project has no `vendor/`, and PHP has no `pdo_pgsql` or `pdo_sqlite` extension in the analysis environment.
- The live PostgreSQL query was not executed here. Test on a development/staging database before release.

## Deploy (no migration needed)

Replace the modified PHP service, and optionally the test/documentation files. No TypeScript/CSS files changed; no frontend rebuild is required for **this fix alone**. From the project root:

```bash
php -l app/Domain/Activity/Queries/MemberActivityFeed.php
php artisan optimize:clear
php artisan test --filter=MemberActivityLogTest
```

If you deploy the complete project bundle and your local compiled frontend assets are stale, build them according to the project's existing release procedure. Do not run a migration or edit live exam data specifically for this issue.

For an optional read-only schema check, use the configured PostgreSQL connection:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'pmp_exam_attempts'
  AND column_name = 'mode';
```

Numeric `mode` meanings are not documented in the approved migration. Investigate the schema difference and the historical meaning of its numeric values separately before displaying exact exam-mode labels or changing that column in production.
