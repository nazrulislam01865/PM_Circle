# Global appearance

The existing account appearance choice was browser-scoped and the dark palette was limited to a settings preview. The root HTML dark class now selects the central PM Circle palette in `pm-design-tokens.css` across public, authenticated member, administrator, authentication and exam interfaces. Light mode retains the original color values. Legacy color uses that serve both solid backgrounds and foreground text have separate color roles so filled buttons, status treatments and brand panels retain readability. No layout, business logic, database schema or permission changes are required.

## Behavior

- Settings > Account > Appearance > Save changes applies the selected Light, Dark or System mode across the site. Discard does not change the saved mode.
- The initial Blade script resolves the browser preference before the application mounts; the shared hook keeps the same root state across Inertia navigation and reloads. System mode follows OS preference changes. Explicit Light/Dark modes do not follow OS changes.
- Preference persists in local storage with a validated cookie fallback; updates propagate to other open tabs. If both are blocked, the current tab still updates and the settings screen explains that persistence failed.
- Appearance remains browser-scoped, not a new account-wide server preference. No requests are added for theme-only saves.
- Résumé A4 previews and certificate paper retain their light document design, including printing. Brand media and uploaded images are not inverted.

## Verification

- Node regression suite: 594/595 passing. The pre-existing `pmpTutorTokenSourceCheck.mjs` assertion expecting `leftJoin('ai_requests as ar'` fails against the unchanged PMP controller in the source archive. No PMP query changes are part of this update.
- Three new global appearance tests pass (actual hook and early initialization script exercised with mocked browser APIs).
- PHP syntax: two changed PHP files pass. TypeScript transpilation syntax: three changed TSX files pass. All 101 CSS files parse with PostCSS.
- Chromium static fixtures: original versus updated light-mode computed colors matched for 22 sampled elements; dark mode verified for public cards/footer, admin panels, shared dropdowns/actions, member cards, exam surfaces and document paper. These are component fixtures using the actual CSS, not authenticated application E2E tests.
- Full frontend compilation/typechecking and authenticated visual QA of every route remain required on staging; the source archive has no installed npm or Composer dependencies. No production server changes were made.

## Deployment

Apply the changed files or full updated source archive. If the previous settings migration has not been applied, follow its existing deployment documentation separately. No new migration is introduced here.

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
php artisan optimize
```

Test Light, Dark and System in both guest and authenticated routes, including admin, course and exam workspaces, modals/dropdowns, mobile screens, and document print/export. Verify mode persists on refresh and navigation; check actual contrast of any custom uploaded artwork separately.
