# PM Circle - Activity Log PostgreSQL UNION + View activity link fix

## Actual root causes

1. The previous change cast `pmp_exam_attempts.mode` to `TEXT`, fixing the description column. However, the PostgreSQL `UNION ALL` still failed because all earlier branches selected untyped `NULL` as `correct_count` and `total_questions`. PostgreSQL resolves an all-unknown column in nested unions to `TEXT` before encountering `pmp_exam_attempts` numeric fields (`SMALLINT`). The resulting `text`/`smallint` mismatch raised SQLSTATE 42804.
2. The `Community contribution` card in `resources/js/components/dashboard/MemberHomeOverview.tsx` still linked to `/dashboard/features/insights`. It was unrelated to the Activity Log route and therefore opened Profile Insights.

## Scoped changes

- `app/Domain/Activity/Queries/MemberActivityFeed.php`: All six non-exam branches now select `CAST(NULL AS INTEGER)` for both score columns. The exam branch selects integer-cast numeric scores, preserving existing score calculations. The existing `CAST(mode AS TEXT)` is retained. No new queries or database tables.
- `resources/js/components/dashboard/MemberHomeOverview.tsx`: "View activity" now links to `/activity-log`. "View insights" remains linked to Profile Insights.
- `tests/Regression/activityLogPostgresContract.test.mjs`: Static type, link, and authenticated route contracts.
- `tests/Feature/Activity/MemberActivityLogTest.php`: Mixed exam/post activity regression additionally checks that another member's exam attempt cannot leak.

## Privacy and access

The Laravel `/activity-log` route remains inside the existing authenticated, member-only, verified, onboarded route group. `ActivityLogController` passes only `$request->user()->id` to the feed; all query sources retain their user/author filters. No user ID is accepted from the page or query parameters.

## Verification

On a system with project Composer dependencies and PostgreSQL configured:

```bash
php artisan optimize:clear
php artisan test --filter=MemberActivityLogTest
node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs tests/Regression/activityLogPostgresContract.test.mjs
npm run types:check
npm run build
```

For local development, after copying the changed files, restart `php artisan serve` if necessary, rebuild frontend assets (`npm run build` or the running Vite dev server), and open `/activity-log` directly before testing "View activity" on the dashboard.

No migrations or destructive database operations are needed. Do not deploy without verifying locally first.
