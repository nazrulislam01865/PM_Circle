# Profile editor navigation, integrated actions and field-level AI suggestions

Base: Archive 10.zip. The two editors keep the same existing 11-section schema and existing centralized Inter design tokens. The legacy imports feature stays disabled. No schema migration or seeding is introduced.

## Layout

- `ProfileWorkspaceHeader` renders the original profile tabs on every profile page, in their original location. On Edit Profile and AI Resume Assistant they are non-sticky; the section jump alone stays sticky. The redundant editor-only Overview action is removed. Sidebar navigation and the Overview/Privacy page sticky tabs are unchanged.
- `ProfileSectionJump` is the sticky secondary editor navigation. It measures its own height (including the existing Edit Profile completion bar), feeds the shared scroll offset, and follows the active section. The sidebar/offer-header offset is reused. Narrow viewports scroll horizontally.
- Edit Profile no longer renders Required fields and Profile visibility help cards or their unused right rail. Its fields occupy the available width in one contiguous form, with the existing section and entry controls. The optional hidden CV import shortcut is preserved behind the existing feature switch.
- Both editors use `pm-profile-editor-actions` as the integrated sticky bottom edge of the form card (not a detached floating card). Existing Edit Profile Cancel / Save changes actions remain. The résumé assistant adds Cancel, retains Save draft, and retains the Submit profile confirmation and permission checks. Cancel returns to Overview without submitting unsaved edits; previously saved drafts are not deleted. The résumé preview and quality rail remain intact.

## Writing suggestions

`resumeFieldSchema.ts` maps every current multiline résumé field to an explicit rewrite target. `ResumeDocumentFields` renders an individual Suggest with AI action directly below each textarea, while the Personal Profile summary has its own action. Empty fields and fictional sample mode cannot submit rewrite requests. The dialog sends the selected field text only and applies the returned suggestion only to the chosen section, entry index and field after explicit acceptance. No automatic profile write occurs.

`AiSubjectContext` extends the existing consented editor-draft rewrite allowlist to Professional summary, Responsibilities, Education highlights, Education courses, Research details, Project details, Skills, Interest details, Language proficiency and Certification details. The existing `resume_rewrite` operation, AI Workspace routing, provider settings, consent, credit reservation, moderation, structured result validation and queue processing remain in place. Enable and configure the existing writing-suggestions operation in AI Workspace before testing live. No new endpoint, AI feature, credential, database query or package is required.

## Verification

- Source regression tests: `node --experimental-strip-types --test tests/Regression/*.test.mjs` — 504/505 passed. Four new tests cover sticky navigation, integrated actions and field rewrite targets. The unchanged PMP dashboard failure was independently reproduced against Archive 10.
- PHP lint, TS/TSX parser checks and strict standalone TypeScript checking of the schema passed.
- Chromium fixtures using project CSS passed at 1600×900, 1280×800, 1024×768, 768×850, 390×844 and 390×480 for both editors: sticky positions, jump clearance, no horizontal overflow and footer bounds. Fixtures are not authenticated application rendering.
- `npm ci --offline --ignore-scripts --no-audit --no-fund` failed because `yuku-parser@0.19.0` is not cached; Node 22.16.0 also falls below Vite Plus's Node 22.18 requirement. Composer and vendor dependencies were unavailable. Full application type checking, production build, Laravel feature tests and live provider requests remain unverified.
- Added feature test: `ResumeAiWorkspaceIntegrationTest::test_editor_rewrite_targets_are_explicit_and_field_scoped`.

## Deployment

Preserve `.env`, database and private storage. Compiled assets, runtime caches and debug snapshots are excluded from the delivery. Use supported Node 22.18+; run `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear`, `php artisan optimize`, and restart the existing AI queue workers with `php artisan queue:restart`. Run `php artisan test --filter=ResumeAiWorkspaceIntegrationTest` in an isolated testing environment. No new migration or seeding is needed for this change.

## Follow-up: restore profile tabs

The original tab bar is restored on both editors, with its sticky class omitted only there. The existing section jump and integrated actions stay sticky. The existing Edit profile header action remains; the redundant Overview shortcut is removed. Source regression: 504/505 (same pre-existing PMP failure). TSX syntax and 12 updated Chromium layout fixtures passed, including the restored tabs scrolling out of view. Full production build and authenticated runtime remain unverified.
