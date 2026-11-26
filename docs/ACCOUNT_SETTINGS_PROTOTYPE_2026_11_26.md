# Account settings prototype implementation — 2026-11-26

Base: Archive 3(4).zip. References: PM_Circle_Account_Settings (1)(1).html and PM_Circle_Design_Guidelines (1)(20261126-052231).html.

## Scope

- New authenticated, verified and onboarded member route `/settings/account`, linked by the shared sidebar and account dropdown. `/settings` redirects there. Existing profile, security, password-confirmation and appearance routes remain available.
- All nine sections and 74 setting rows are represented from the supplied prototype. Uses the existing member shell, account page rail, shared Inter design tokens, buttons, controls, reusable cards/rows, native switches, shared progress bar and accessible dialogs. Sticky horizontally scrollable navigation, cross-tab draft, change count, discard, validation and save feedback.
- Server validates changed fields only; preferences merge under a member-row lock in one transaction. Existing global profile audience and grouped experience/education and skill/certification privacy use the existing profile columns and privacy enforcement. Unrelated individual field choices are preserved. Email changes use the existing profile workflow; password, MFA and recovery-code actions use the password-protected security page.
- One nullable JSON column `users.account_preferences` holds preferences; no additional preference tables or seed data. Browser appearance uses the existing appearance hook. Text size and reduced motion apply within this workspace. Anonymous posting is a default only and does not bypass plan eligibility. Native lesson video uses the saved playback rate and caption preference when tracks exist.
- Optional social/challenge notifications respect delivery, topic and quiet-hour settings in ActivityNotifier, using one recipient lookup only when sending optional activity. Quiet hours skip rather than queue optional messages; transactional mail and administrative alerts are unaffected. Account timezone is used for this quiet-hour check.
- AI usage data is an optional Inertia prop fetched when the AI section is opened, not on the default page load. Existing plan and usage pages, quota logic and checkout are reused; no fabricated usage, membership prices, card data or payment success.
- Settings JSON export downloads saved values; it is not a full account export. Full export request links to support. Account deletion uses existing password-validated route. Current session dialog shows actual browser user-agent, not sample device data.

## Explicit limitations

The HTML prototype uses fake accounts, browser-only preferences and preview dialogs for many operations. 31 rows are intentionally disabled because the project does not have their live enforcement/workflows (for example browser push, optional email/digests, several notification topics, separate contact/resume/badge/result audiences, follow/mention/blocked-account controls, global AI history, separate billing email, payment methods, invoices, renewal, cancellation, other-device revocation and temporary deactivation). Several ordinary regional, learning and AI preferences are persisted but are labeled as not yet consumed by their modules. Do not represent them as enforced. Existing member shell remains unchanged; the dark preview colors are scoped to this settings workspace. This is not complete feature parity with the prototype. Inter is used as required by the supplied design guidelines rather than the prototype's Rajdhani/Source Sans fonts.

## Verification

- All nine changed/new PHP sources passed `php -l`; eight changed TS/TSX files passed TypeScript syntax transpilation; three CSS files parsed with PostCSS.
- 13 focused Node tests passed; entire Node regression suite: 439 passed, two failed. Both failures (`pmpWorkbookAndDashboard` and `profileEditorPrototype`) were reproduced against the original archive. No unrelated test changes.
- New Laravel feature tests cover account-scoped persistence, validation, guest access and optional notification suppression. Not run: vendor/autoload.php missing. Production build not run successfully: `vp` is missing. Full TypeScript type check and authenticated browser visual/interaction checks remain unverified.
- No deployment performed. The archive excludes runtime session files, cached views, debug snapshots and bootstrap generated caches; original public build is stale and must be rebuilt.

## Apply

Back up the database, merge the source, install dependencies with Composer and npm, run `php artisan migrate --force`, `npm run types:check`, `npm run build`, `php artisan test --filter=AccountSettingsPrototypeTest` in a test environment, and clear/rebuild production caches. Restart queue workers to pick up the updated notification preference enforcement. No seed is necessary.
