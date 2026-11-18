# Member third-level menu scroll behavior (2026-11-18)

## Scope

The Scenario Library filter tabs, My Profile sub-tabs, and PMP simulator dashboard tabs now remain visible during page scrolling, aligned beneath the existing primary and secondary member navigation. The public Scenario Library variant uses the public header height instead. Existing Community feed sticky controls were intentionally not modified.

## Files changed

- `resources/js/pages/scenarios/Index.tsx`: adds the shared sticky class to Scenario Library view tabs.
- `resources/js/pages/settings/profile.tsx`: adds it to My Profile tabs.
- `resources/js/components/exam/PmpWorkspacePanels.tsx`: adds it to PMP Overview / Performance / Exam History / AI Usage tabs.
- `resources/css/pm-member-navigation.css`: one shared scoped sticky rule; offsets are derived from `--header-height` and `--pm-member-secondary-height`. Retains the existing tab background colors and visual styles.
- `tests/Regression/memberTertiarySticky.test.mjs`: source-level checks of the affected menus and offset contracts.

No controller, route, database, authorization, filtering, exam, or profile logic changes.

## Verified

- `node --experimental-strip-types --test tests/Regression/memberTertiarySticky.test.mjs tests/Regression/memberNavigation.test.mjs`: 15/15 passed.
- TypeScript transpile syntax checks on the three affected TSX files: no diagnostics.
- `pm-member-navigation.css` parsed with `tinycss2`: no stylesheet errors.
- Isolated Chromium scroll tests using the actual navigation, token and page-level CSS at viewport widths 1662, 820, and 390: member tabs remained at the computed `header + secondary` offset; public Scenario Library tab stayed at the public header offset. No horizontal overflow in the fixtures.

Full authenticated Laravel interaction tests and `npm run build` were not completed: offline `npm ci` cannot fetch uncached `yuku-parser@0.19.0` and local Node 22.16 is below some dependencies' minimum (22.18). The ZIP contains source changes, **not** a newly compiled Vite bundle.

## Deployment

1. Copy the changed source files to the existing PM Circle project, preserving paths.
2. With compatible Node.js (22.18+), run `npm ci`, `npm run types:check`, `npm run build`.
3. Run `php artisan optimize:clear` and refresh the browser (hard reload if necessary).
4. Verify the three navigation bars while scrolling logged-in Scenario Library, Profile and PMP pages. The footer must remain below content. Also verify the public Scenario Library tabs.

No migration is required. Do not deploy an unbuilt `public/build` directory as if it contained these source changes.
