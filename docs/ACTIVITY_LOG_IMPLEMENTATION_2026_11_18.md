# PM Circle — Member Activity Log (18 November 2026)

## Source and scope

Based on `PM_Circle_Three_Level_Member_Navigation_Updated_Project(1).zip`, which already includes the approved three-level authenticated navigation. `Archive 3(8).zip` is the earlier version; its community menu did not yet have the revised navigation. Public pages, the existing header shell, and the footer were not redesigned.

The new `/activity-log` page uses the approved reference layout: profile breadcrumb, page title/subtitle, outline danger action, a white activity card, three dropdown controls, date-section bars, per-type icon circles, exam performance badges, time column, a compact Load more action, and an information strip. Mobile controls/rows use responsive layouts and appropriate labels.

## Data behavior

- All events are read on demand from the existing authorized member's domain records: published posts, discussion comments, post saves, post reactions, scenario submissions, published learning-path completions, and completed PMP attempts. No fabricated examples or duplicate event-ingestion writes.
- Filters: activity type, all/today/7/30/90 days, and newest/oldest. One UNION ALL timeline read with at most 13 rows selected for a 12-row response; opaque composite cursor avoids unbounded offsets. When a filter is specified, unrelated source branches are omitted.
- PMP percent/target badges use existing `pmp_exam_settings` target ranges, with the scoring coming only from persisted deterministic attempt results. Other score badges are not invented where no saved score exists.
- Clear history writes a per-user `hidden_before` checkpoint. It does **not** delete or modify the original domain/administrative records. Other members are unaffected. New activity after the checkpoint remains visible.
- The page is member-only behind existing auth, email verification and onboarding middleware; JSON load-more and clear endpoints are individually throttled.
- The member navigation's Community > My activity and the account dropdown's Activity Log now point to `/activity-log`.

## Files

- `app/Domain/Activity/Queries/MemberActivityFeed.php` — bounded multi-source timeline, filters, cursor, links, deterministic score formatting.
- `app/Http/Controllers/Account/ActivityLogController.php` — Inertia page, paginated JSON and per-member clear.
- `database/migrations/2026_11_18_000001_create_member_activity_visibility.php` — visibility checkpoint and concurrent PostgreSQL read indexes.
- `routes/web.php` — protected Activity Log routes.
- `resources/js/pages/account/ActivityLog.tsx` — page composition and safe filter/load/clear interactions.
- `resources/js/components/activity/ActivityLogParts.tsx` — reusable select, activity row, date group and information strip.
- `resources/css/pm-activity-log.css`, `resources/css/app.css` — isolated prototype styling using centralized PM Circle tokens.
- `resources/js/components/dashboard/memberNavigation.ts` — existing three-layer member navigation destination.
- `resources/js/components/dashboard/DashboardHeader.tsx` — account dropdown link.
- `tests/Feature/Activity/MemberActivityLogTest.php`, `tests/Regression/memberNavigation.test.mjs` — authorization, pagination, filters, clear and menu coverage.

## Deploy (from the Laravel project root)

Do not upload the changed code without compiling the React assets. Back up the database before the migration and deploy during a controlled release.

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run types:check
npm run build
php artisan migrate --force
php artisan optimize:clear
```

Optional pre-deployment/staging checks:

```bash
php artisan test --filter=MemberActivityLogTest
node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs
php artisan route:list --path=activity-log
```

The migration adds one user-scoped table and nonblocking PostgreSQL read indexes. It does not delete production data. Existing historical source records are displayed when still present and eligible; interactions already removed from their source tables cannot be recreated retrospectively.

## Verification in the supplied environment

- PHP syntax checks on changed PHP files: passed.
- TypeScript transpile/parser syntax checks on changed frontend files: passed.
- Node member-navigation regression suite: **5/5 passed**.
- Full Laravel tests: **not executed**; Composer and PHP PDO SQLite/PostgreSQL drivers were not available in the analysis container.
- Full project TypeScript type-check/build: **not completed**; `npm ci` could not complete in this environment, and its Node v22.16.0 is below the project dependency requirement (>= v22.18.0). Run the deployment commands in your configured environment with a supported Node version.
- Browser visual comparison against a running application: not performed because a running database/backend was unavailable.
