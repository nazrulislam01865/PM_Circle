# Member secondary navigation — page/footer overlap fix (18 November 2026)

## Verified root cause

The approved three-level navigation added a new grid track for the secondary menu, placing authenticated page content in grid row 3. An older rule in `resources/css/pm-member-shell.css` still assigned `.pm-member-shell > .pm-unified-footer` to grid row 3. Those two elements overlapped. The footer's dark background covered the content on the PMP member dashboard and could similarly cover Home, Community, Learning, and Activity Log pages.

The supplied baseline archive (`Archive 3(9).zip`) predates the secondary navigation and uses the old two-content-row shell. Comparing its layout to the navigation update identified the conflicting grid assignment.

## Exact changes

- `resources/css/pm-member-navigation.css`: declare the four tracks (primary, secondary, page, footer); override the original member-footer row with `grid-row: 4` after the existing member-shell stylesheet. This fix remains scoped to the authenticated navigation; guest/public and admin layouts are untouched.
- `tests/Regression/memberNavigation.test.mjs`: add regression coverage checking that content stays on row 3, the footer moves to row 4, and stylesheet ordering protects the override.

No changes to shared fonts, design tokens, header structure, dropdown data, exam logic, routes, permissions, migrations, database queries, or application configuration are needed.

## Verification executed here

- `node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs`: **6/6 passed**.
- Chromium headless grid-layout verification using real relevant source CSS and a representative member shell: footer begins after page content at 390, 768, 1440, and 1656 CSS-pixel viewport widths: **passed**.
- Full Laravel runtime, full Vite production build and end-to-end authenticated visual test: **not performed** in this environment. The Chromium check uses representative DOM, not a live Laravel/Inertia login.

## Deployment

1. Back up the existing `resources/css/pm-member-navigation.css` and `tests/Regression/memberNavigation.test.mjs`.
2. Copy the changed files into the project's corresponding paths. If applying the patch to a project older than the three-level navigation release, do not use the patch by itself; install the three-level navigation release first.
3. Run `npm ci` with the supported Node.js version, `npm run types:check`, `npm run build`, and the regression command above.
4. Upload/deploy newly built frontend assets, then run `php artisan optimize:clear` under the standard deployment workflow.
5. Test `/exams/pmp` (Overview/Performance/Exam History/AI Usage), Home, Community, Learning and `/activity-log` at desktop and mobile widths. Confirm the footer follows the last visible page section and no overlap remains.

There are no database changes. Do not run migrations for this UI-only hotfix.
