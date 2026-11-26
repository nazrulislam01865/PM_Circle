# Shared account/profile privacy and wider settings controls

Base: Archive 4(3).zip. The user requested the actual My Profile privacy settings on the Account Settings page, and wider text fields.

## Changes
- Both pages render `ProfilePrivacyEditor` from `resources/js/components/profile/ProfilePrivacyTab.tsx`. One canonical configuration supplies the same four field groups and 31 choices, the visibility options, and saved-audience preview. Both expose the existing global profile audience. Account Settings retains its cross-tab draft, discard, and sticky Save changes bar. My Profile has its own save/discard actions.
- Both request classes reuse `ProfileFieldPrivacy::validationRules()`; the server requires a complete allowlisted visibility map with a valid audience for each key. Account Settings saves that map directly to the existing `profiles.field_visibility` column and the global choice to `profiles.visibility` in the existing transaction. My Profile uses its existing authenticated profile update route. No duplicate privacy preferences, additional profile relationship queries, schema changes or seed data. Full-map writes represent the selections displayed by the editor; as before, simultaneous editors may overwrite one another's saved choices.
- Removed the old grouped privacy approximations and unavailable placeholder rows from the Privacy tab only. Contact details and uploaded CV remain private. Other account settings remain available as before; no unsupported action is presented as working.
- Personal-detail text controls use 22rem width (bounded by available space); ordinary selects use 15rem and controls stack at small container widths. Read-only email is rendered as a wrapping output with the existing Edit profile link, so long email addresses are not clipped. Design tokens, existing member shell and shared controls are retained.
- Five previously save-only interview defaults (industry, role, experience, answer mode and question count) now initialize new interview practice using existing catalog choices; inactive or missing catalog entries fall back to available options. No new catalog query is introduced.

## Limitations
- This is not a complete implementation of every Account Settings feature. Outside the shared Privacy tab, 23 unavailable controls still lack their underlying services/workflows (other-device revocation, additional delivery channels/topics, follow/mention/block restrictions, event contact, AI history/profile consent, renewal/cancellation, payment methods, separate billing email, invoices and deactivation). Nine preferences still persist without a downstream consumer (language, time format, goal, interest, exam mode, rationales, event calendar, low-balance warning and AI response language). Timezone is consumed for quiet hours, not all event/reminder displays. Account-level accessibility remains scoped as documented in the earlier settings implementation. These need separate module work, not fake switches. The interview preferences currently offer the prototype's fixed labels; an administrator's changed catalog can cause a safe fallback.
- No production deployment, browser rendering comparison, full TypeScript type check, or Laravel feature test run was completed. The archive lacks vendor and npm dependencies. Build output is omitted because it predates these source changes. Rebuild before serving the app. Runtime sessions, compiled views, generated bootstrap caches and Inertia debug snapshots are excluded.

## Verification
- PHP syntax checks for changed PHP files; TSX syntax transpilation for changed TSX files; PostCSS parsing for changed CSS files: passed.
- Node regression suite using `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 441 passed, 2 failed. The failures in `pmpWorkbookAndDashboard` and `profileEditorPrototype` also fail on the unmodified uploaded archive.
- Added cross-page persistence, public visibility and invalid-field feature tests; not run because `vendor/autoload.php` is missing. Frontend build blocked by missing `vp`.

## Apply
Install dependencies, run `npm run types:check` and `npm run build`, then run `php artisan test --filter='AccountSettingsPrototypeTest|ProfileFieldPrivacyTest'` in the test environment. Clear caches before deployment. No new migrations or seeds are required for this patch on a database already migrated for Account Settings. On older databases, apply existing pending migrations normally after backup.

### Follow-up: Account Settings presentation

The shared privacy editor now accepts `showSidebar` (default true). Account Settings passes false to omit Visibility options and Preview saved visibility; the form fills the available width. My Profile retains both cards. No backend, persistence, or database changes.
