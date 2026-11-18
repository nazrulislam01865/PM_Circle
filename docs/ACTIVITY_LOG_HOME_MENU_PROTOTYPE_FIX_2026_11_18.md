# PM Circle — Activity Log Home navigation and prototype alignment

Date: 2026-11-18
Source: `Archive 6(2).zip`, the supplied Activity Log prototype image, and the bundled `PM_Circle_UI_Style_Guide (4)(8).html`.

## Root cause

1. `memberNavigation.ts` placed `/activity-log` in the Community secondary navigation (`My activity`) and retained `Profile insights` in the Home secondary navigation. This did not match the approved requested placement.
2. The authenticated dashboard's general content inset and width rules affected Activity Log, creating a different content layout than the supplied prototype.
3. Global browser/PM Circle default paragraph margins inherited into activity row descriptions, the heading subtitle and privacy notice, making rows and cards taller than the prototype.

## Changes

- `resources/js/components/dashboard/memberNavigation.ts`
  - Home secondary: Overview, My profile, Achievements, **Activity Log**, Settings.
  - Removed `My activity` from Community secondary; Feed, Members, Topics and Saved posts remain.
  - `/activity-log` now selects Home > Activity Log.
  - Existing `/dashboard/features/insights` page is preserved as a legacy direct destination; the tab now links to `/activity-log`.
- `resources/js/components/dashboard/DashboardSidebar.tsx`
  - Updated the legacy member sidebar navigation label and destination for consistency, where that component is used.
- `resources/css/pm-activity-log.css`
  - Activity-only content width and container padding overrides; no changes to the shared dashboard shell or public pages.
  - Activity page background uses existing centrally defined color tokens.
  - Preserved prototype structure: breadcrumb, heading, clear-history button, filters, date sections, activity rows, score pills, load more, privacy notice.
  - Fixed inherited paragraph margins, date-section height, and responsive container width to match the prototype more closely.
- `tests/Regression/memberNavigation.test.mjs`
  - Updated Home/Community expectations, asserted member menu destinations and Activity Log isolated styling, retained footer and third-level navigation regressions.

## No changes to existing business features

No backend queries, models, migrations, permissions, pagination behavior or tracking logic have been modified. The Activity Log controller remains authenticated and reads the current member's activity using `request()->user()->id`. The earlier PostgreSQL UNION type casts remain intact. Original profile insights reporting is not removed, and the existing Home overview cards remain unchanged.

## Verification performed in this environment

- Node navigation and PostgreSQL static regression tests: **11/11 passed**.
- TypeScript syntax transpilation on changed source files: **passed**.
- Chromium *static fixture* render using the original project CSS and representative Activity Log markup at 1496px, 820px and 390px widths: **no page-level horizontal overflow**.
- The desktop activity card is centered at width **1252px** at viewport **1496px**; activity rows are **51–52px** high. Fixture content is used only for visual QA and is **not** included as application data.
- PHP backend files unchanged; full Laravel feature tests and frontend build were **not** run here because `vendor` and `node_modules` are not present in the uploaded archive.
- Pixel-perfect matching of the **live Laravel application** remains to be checked in the developer's environment; the static browser fixture is not equivalent to an authenticated end-to-end render.

## Local development verification and deployment

Use the changed-files ZIP to replace matching paths in the existing working tree; this change does not require replacing `.env` or database files.

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
php artisan test --filter=MemberActivityLogTest
node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs tests/Regression/activityLogPostgresContract.test.mjs
php artisan route:list --path=activity-log
```

Use Node.js >= 22.18 (or a supported version listed by this project's current packages). Inspect changes and back up the project before deployment. Publish newly built frontend assets alongside CSS/TSX source changes. Clear asset/browser cache if old menu labels persist. No migration or database operation is required.

## Expected behavior

- Home > Activity Log is the active primary and secondary navigation state on `/activity-log`.
- Community does not show a duplicate Activity Log secondary item.
- The Home dashboard's Community contribution > View activity still navigates directly to `/activity-log`.
- `/activity-log` continues to list only the authenticated member's real activity, not the sample prototype entries.
