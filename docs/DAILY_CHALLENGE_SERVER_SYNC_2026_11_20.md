# PM Circle - Daily Challenge live/local source sync (2026-11-20)

## Purpose

This source tree is the user's uploaded `PM_Circle_Inertia_Reload_TypeScript_Fix_Full_Project(2).zip` with the SAME THREE production code patches applied in order:

1. `PM_Circle_Daily_Challenge_Recovery_Updated_Project.patch` - readiness probe, audited draft/review recovery, fail-closed response handling, regression tests.
2. `PM_Circle_Daily_Challenge_Use_Post_Check_Omni.patch` - Daily Challenge uses the EXISTING Post Check key for external Omni moderation only. Daily Challenge generation and review still use the dedicated Daily Challenge key with `gpt-5-nano`.
3. `PM_Circle_Allow_Todays_Future_Slot_Recovery.patch` - an exhausted draft for today's Dhaka date can be recovered only BEFORE its configured publication time; past slots and expired publication windows remain blocked.

The nine originally changed files plus `config/pm-ai.php` are synchronized with the deployed patches. No front-end components, PMP Exam Simulator features, schema/migrations, existing price/credit policies, or other feature code were modified by these patches.

## Final code paths synchronized

- `app/Console/Commands/CheckDailyChallengeAi.php` (new)
- `app/Console/Commands/RecoverDailyChallengeDraft.php` (new)
- `app/Console/Commands/RecoverDailyChallengeReview.php` (new)
- `app/Domain/AI/Providers/OpenAiResponsesProvider.php` (updated)
- `app/Domain/DailyChallenge/Jobs/QueueDailyChallengeReview.php` (updated)
- `app/Domain/DailyChallenge/Services/DailyChallengeModerationProbe.php` (new)
- `config/pm-ai.php` (updated)
- `docs/DAILY_CHALLENGE_PRODUCTION_RECOVERY.md` (new, original recovery-stage guidance)
- `tests/Feature/AI/DailyChallengeModerationProviderTest.php` (new)
- `tests/Feature/AI/DailyChallengeRecoveryTest.php` (new)

NOTE: The recovery-stage document above was written before shared Post Check Omni routing was deployed. This document supersedes its older discussion of which key the `--probe` command checks, and of whether today's still-future slot may be recovered.

## Credentials and runtime settings - NOT inside this ZIP

Keep the existing secure server `.env`, particularly:

- `OPENAI_DAILY_CHALLENGE_API_KEY`: Responses API key for scenario generation and member answer review using `gpt-5-nano`.
- `OPENAI_POST_CHECK_API_KEY`: the working Omni Moderations API key, reused for Daily Challenge safety preflight and output checks.
- `OPENAI_API_KEY`: Exam Simulator/other gateway key (do not replace or mix).
- `PM_AI_POST_CHECK_PROVIDER=omni` and the currently approved AI feature flags, budgets and queue configuration.

Do not commit or distribute real keys; this source ZIP deliberately does not include an `.env`. The source may be copied to an existing local Laravel installation that already has a valid `.env` and dependencies. For a fresh local clone, provision both securely.

## Production-only state - NOT in source ZIP

Preserve PostgreSQL, `storage/app` user content, and the server's live `.env`. The source archive DOES NOT restore:

- `ai_features` and published `ai_prompt_versions` (including approved PMP records and Daily Challenge prompts);
- approved Pro/Plus chat policies, pricing, usage counters, credit accounting and admin permissions;
- `daily_challenge_settings` (latest verified `publish_time=23:30` Asia/Dhaka, `auto_publish=true`, `auto_review=true`);
- generated drafts, previous request records, audit history and published scenarios;
- the existing cron and Supervisor definitions.

At the time of the server verification, the 2026-11-20 challenge was successfully generated, manually reviewed and published (scenario ID 2). DO NOT run a second recovery or publish action for that date. Draft #6 (November 21) was submitted for recovery earlier; verify its latest state before further actions. Some November 22-27 drafts previously failed and must be inspected/recovered individually; updating code alone does not reset exhausted attempts.

## Local verification after copying the code

From the local Laravel root (PHP 8.4):

```sh
php -l app/Domain/AI/Providers/OpenAiResponsesProvider.php
php -l app/Console/Commands/RecoverDailyChallengeDraft.php
php -l app/Console/Commands/RecoverDailyChallengeReview.php
php artisan test --filter=DailyChallengeRecoveryTest
php artisan test --filter=DailyChallengeModerationProviderTest
php artisan test --filter=DailyChallengeAiTest
php artisan test --filter=AiGatewayIntegrityTest
```

The uploaded source archive has no `vendor/`, so Laravel feature tests were not executed when this ZIP was assembled; run them in your installed local project. This merge did not modify React/TypeScript files, so it introduces no new frontend build requirement.

## Tomorrow's production redeploy precautions

1. Before deployment, create a PostgreSQL backup and inspect `git status --short` on BOTH local and live. Server hotfixes may still be uncommitted.
2. Commit these synchronized changes to the intended repository branch before any deployment workflow that resets server files. Otherwise a future checkout/pull/reset can undo the working moderation routing and recovery commands.
3. Prefer a source-only diff/merge. Do not blindly overwrite newer server files with an older ZIP. Do not use a destructive `rsync --delete` against the application root.
4. NEVER overwrite `.env`, `storage/`, production DB, the live users' uploads, or live Supervisor/cron settings with local content. Do not run `migrate:fresh` or a reset seeder.
5. After deploying PHP code, use the established service-safe process:

```sh
cd /var/www/pm-circle
php8.4 artisan optimize:clear
php8.4 artisan config:cache
php8.4 artisan queue:restart
supervisorctl status
php8.4 artisan pm:post-check-test
php8.4 artisan daily-challenge:check --probe
php8.4 artisan schedule:list
```

6. Ensure both `pm:post-check-test` and `daily-challenge:check --probe` report HTTP 200 / moderation available. Check website posting and member answer-review after a real submission. Confirm all queues are RUNNING after graceful restart.
7. Only recover an eligible failed future slot if needed, first using `daily-challenge:recover-draft YYYY-MM-DD` as a dry run. The write version requires an approved admin ID (`--actor`), audit reason and `--execute`. NEVER bulk-reset or re-run a published date.

## Build-package hygiene

The full ZIP includes the user's original application source and assets with the 3 live patches merged. Logs, Laravel compiled caches, local session/views and Inertia devtools runtime recordings are omitted from the delivery archive (they are not deployable source and may contain private runtime data). They are rebuilt at runtime in a correctly provisioned Laravel installation.

## Verification during ZIP assembly

- All three deployed patch files passed `git apply --check` sequentially against the uploaded full source.
- All three patches were applied in production order without conflicts.
- `php -l` passed for all 9 relevant changed PHP source/test/config files.
- 10 targeted dependency-free Node static regression checks passed; a broader 11-check run included one existing PMP assertion requiring an obsolete `leftJoin('ai_requests as ar')` string not present in the user's original controller, unrelated to these changes.
- Laravel feature tests require installed Composer dependencies and an isolated test database; no production data was used for testing.
