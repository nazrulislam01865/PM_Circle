# AI settings — Career Trends layout (25 November 2026)

## Scope and baseline
Built on the supplied `Archive 3(1).zip`. Reuses `AdminLayout`, `AdminChoice`, `AdminMultiChoice`, Career Trends CSS and existing design tokens. No dependencies added. Existing Career Trends page left unchanged. New screens are responsive and use the same two-column card system. Exact visual parity has not been browser-verified.

## Routes
- `/admin/ai/daily-challenge` (existing): redesigned, existing save/generate/expiry routes retained. Draft generation is a dialog, history and per-event expiry controls remain accessible below the cards. Publishing preview is calculated from editable schedule, not a scheduled-job guarantee.
- `/admin/ai/pmp-settings`: separate settings page, linked from existing PMP question management. Saves only `enabled` and `model` on the two existing AI tutor feature records, validates model allowlist, published prompts, current model prices, and follow-up dependency. Existing question bank, exam settings, scoring, imports, sample questions, plan policies and quotas are not modified. The exam summary is read-only, with links to the original editor. AI does not generate exam questions or determine scores. No invented passing score.
- `/admin/ai/feed-moderation`: linked from existing Community moderation page. Existing provider model and scope shown; safety checks, uncertainty rules and violation handling retained. Only new policy is optional manual review of clean content; default false preserves automatic publication. Uses one additional database read for clean post/comment decisions only; no new queries on ordinary page loads unrelated to these settings. No records are automatically deleted. Scope toggles, sensitivity, notification rules and timed retention are not implemented because the existing pipeline has no such policies; the displayed fixed controls are read-only. The moderation preview is labelled as an example until a real synthetic Omni test is run. No fake status or confidence values.

## Connection management
All three cards use the actual feature-specific server key (Daily Challenge dedicated key, PMP general API key as currently configured, Feed dedicated key). No credentials sent to browser. POST model-access test uses bounded HTTP timeouts and 10-minute cache keyed to feature/model/key fingerprint. It verifies model access only, not actual inference, budget or moderation permissions. It can fail with restricted API keys that disallow reading models even if inference works. Existing Career Trends budgeted generation diagnostic is not reused as-is because it is tied to the trend feature, model, prompt, budget and editorial queue. Feed Omni mode additionally supports real free synthetic moderation via the existing checker; Responses mode does not make a billable diagnostic outside its budget system. No automatic provider calls on page load.

## Access and audit
Active, email-verified administrators now have feature and editorial access automatically through `AiAdminAccess`. This covers all four AI settings screens, connection tests, Daily Challenge generation and editorial workflows. No grant command is required for those permissions. Normal members, suspended and unverified administrators remain blocked. Separate reporting, quota, credit, package, prompt and model-price permissions and explicit recovery-command requirements remain unchanged. Existing permission rows are preserved. The `Title direction` label is now `Scenario title guidance` with a short example placeholder; the existing `generation_title_hint` value and its generation behavior are unchanged.

Settings writes are audited and transactional. Existing PMP token and plan allocations are left untouched.

## Database and deployment
Additive migration `2026_11_25_000003_create_feed_moderation_settings.php`. Adds a singleton row with `hold_clean_content=false`; no existing rows or schema altered. Deploy migration before restarting the post/comment workers. No seed/reset required. Keep existing .env, storage and database. Full frontend build required (stale public/build excluded). Restart queue workers after migration and deployment.

## Verification
- Existing and added Node source regressions: 355 passing (350 existing, 5 added).
- PHP lint and TSX parsing checked on changed files. These are not full type checks or runtime tests.
- Added Laravel feature tests `FeatureSettingsTest` and `PostOmniModerationTest::test_clean_post_can_be_held_without_recording_a_violation`; not executed in this environment because dependencies are absent. No live provider API calls made. Full frontend build, database tests and visual QA pending.

```bash
composer install
npm ci
php artisan optimize:clear
php artisan migrate
npm run types:check
npm run build
php artisan test --filter=FeatureSettingsTest
php artisan test --filter=PostOmniModerationTest
php artisan test --filter=DailyChallengeGenerationGuidanceTest
php artisan queue:restart
```
