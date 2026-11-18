# PM Circle - Activity Log shared member layout correction

Date: 2026-11-18
Source: updated PM Circle project in `PM_Circle_Activity_Log_Home_Menu_Prototype_Fix_Full_Project.zip`, the user-provided Activity Log screenshot, other member page layouts, and the bundled approved UI style guide.

## Root cause

The Activity Log stylesheet introduced a page-specific `1252px` maximum width and used `:has(.pm-activity-page)` selectors to reset the authenticated dashboard body padding, member content width, and workspace background. Those overrides bypassed the common member layout and made the Activity Log narrower than the rest of the application.

The shared member layout already supplies a `1480px` maximum-width content frame, responsive side gutters, and the normal canvas background via `MemberDashboardLayout`, `pm-member-shell.css`, and `pm-member-pages.css`. There is no need to duplicate those rules for Activity Log.

## Fix

- `resources/css/pm-activity-log.css`: removed the custom 1252px wrapper, `:has()`-based page-body/background overrides, and the redundant narrow-screen wrapper width. Kept the Activity Log's typography, buttons, cards, filters, date groups, rows, score badges, and responsiveness unchanged.
- `tests/Regression/memberNavigation.test.mjs`: replaced the old regression expectation that required an isolated 1252px layout with assertions that require the shared authenticated member frame and prohibit page-specific body/background/width overrides.

No changes to navigation destinations, member-only access, activity queries, filtering, clearing, frontend data/state, shared page styling, or other pages.

## Verification performed

- Node regression tests: 11/11 passed using `node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs tests/Regression/activityLogPostgresContract.test.mjs`.
- Static Chromium fixture with the existing project's CSS: no document horizontal overflow at 1662, 1496, 820, or 390px viewport widths.
- At 1662px, the Activity Log content begins at x=91 and measures 1480px wide, matching the authenticated `.pm-dash-body` width (instead of the former 1252px container starting around x=205).
- At 820px and 390px, the content is inset by 16px on either side with no horizontal scroll; the footer follows content in a separate grid row.
- The fixture includes representative data for layout checking only. A live authenticated Laravel browser run, PostgreSQL feature tests, and the complete frontend build were not executed; the uploaded project has no `node_modules` or `vendor` directory.

## Deployment

Copy `resources/css/pm-activity-log.css` into the current PM Circle project and optionally update the regression test and documentation. Back up / review existing modifications before replacing the files.

```bash
npm run build
php artisan optimize:clear
node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs tests/Regression/activityLogPostgresContract.test.mjs
```

The CSS file is bundled by `resources/css/app.css` and therefore requires rebuilding/publishing the frontend assets. No migrations or database changes are needed. Check `/activity-log` in the logged-in app at both desktop and mobile widths and hard-refresh the browser if an old asset is cached.
