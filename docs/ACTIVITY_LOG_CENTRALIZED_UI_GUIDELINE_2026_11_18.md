# Activity Log: approved UI style-guide compliance correction (2026-11-18)

## Source and scope

- Baseline: `PM_Circle_PMP_Exam_Start_Prototype_Full_Project.zip`, which contains the latest Activity Log implementation and the previously approved exam-start work.
- Approved guide: `PM_Circle_UI_Style_Guide (4)(8).html` (same tokens as the user-supplied `(3).html` guide).
- Screenshot reviewed: `Screenshot 2026-11-18 at 2.36.33 PM.png`.
- Scope restricted to Activity Log display and its two reusable UI subcomponents; no changes to routes, controller, database tables, member authentication, question bank, or exam simulator.

## Corrected

- Uses the existing authenticated member container; **does not overwrite its width**, secondary navigation, or footer. The style guide's 1120px reference is for its sample sidebar shell; PM Circle's already-approved authenticated page container controls actual width here.
- H1: `--text-h1` / `--line-h1` (28/36 desktop; 24/32 mobile from global responsive tokens).
- Day-group H2: `--text-h2` / `--line-h2`, 700; activity item title: `--text-h5` / `--line-h5`, 600.
- Description, timestamp and breadcrumb: `--text-sm` / `--line-sm` (13/20); score pill: `--text-xs` / `--line-xs` (12/16).
- Icons: `--icon` (20px), styled through one reusable selector; icon backgrounds use the global success/blue/warning tokens.
- Filter selects use the shared `.pm-select` class and `--control-border`, `--control-height`, `--radius-control`, and the shared focus-visible behavior. Preserve native selects and ARIA labels.
- Clear history and Load more reuse `.pm-button.pm-button-outline` for font, focus, sizing and disabled states. Clear history retains its action-specific red tone using the shared `--red` and `--red-soft` tokens.
- Cards and separators use `--surface`, `--border`, `--radius-card`, `--s5`, and the shared `--pm-shadow`.
- Tablet/mobile breakpoints now use 53rem / 42rem as in the approved guide; filters stack individually on small screens to prevent clipped labels, and responsive page content avoids horizontal scrolling.
- Active breadcrumb item now has `aria-current="page"`.

## Changed paths

- `resources/css/pm-activity-log.css` — replaces hardcoded component metrics with shared tokens and delegates control styling to the existing shared primitives.
- `resources/js/pages/account/ActivityLog.tsx` — adds canonical shared button classes; leaves click handlers and remote activity logic unchanged.
- `resources/js/components/activity/ActivityLogParts.tsx` — native select reuses `.pm-select`; icons inherit `--icon` from CSS; does not change activity definitions/data mapping.
- `tests/Regression/activityLogUiGuideline.test.mjs` — protects all style contract points and navigation behavior.
- This document.

## Verification performed

- Source regression suite: 16 tests passed with Node 22.16 `--experimental-strip-types` (new guide-compliance checks plus activity PostgreSQL and navigation checks).
- TypeScript `transpileModule` syntax checks for both changed TSX files: passed.
- CSS stylesheet/declaration parsing: passed.
- Isolated Chromium computed-style and overflow checks at 1662px, 820px, and 390px: passed. 20px icon, 12px badge, 13px description/time, 14px button, 40px desktop select, 44px mobile select, 24px mobile H1. These are isolated markup checks, **not** an authenticated running Laravel/Inertia screenshot comparison.
- Full TypeScript type check could not run successfully here because the extracted source has no installed `node_modules`; missing React/Inertia/Lucide module types were reported. Full production build and live PostgreSQL feature tests were not executed in this container.

## Deployment / local verification

```sh
npm ci
npm run types:check
npm run build
php artisan optimize:clear
node --experimental-strip-types --test tests/Regression/activityLogUiGuideline.test.mjs tests/Regression/activityLogPostgresContract.test.mjs tests/Regression/memberNavigation.test.mjs
```

Then open `/activity-log` as an authenticated, onboarded member and compare against the approved screenshot at desktop and mobile widths. The existing backend implementation remains unchanged; no migrations are necessary.
