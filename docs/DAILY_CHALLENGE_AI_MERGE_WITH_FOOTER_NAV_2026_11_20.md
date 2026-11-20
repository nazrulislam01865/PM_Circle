# PM Circle: Daily Challenge AI changes merged into Footer Navigation project (2026-11-20)

## Source selection and merge scope

- **Baseline (kept as-is outside the AI changes):** `PM_Circle_Footer_Navigation_Relocation_Full_Project_20261120 (1).zip`
- **AI fixes imported from:** `PM_Circle_Full_Project_Synced_With_Live_Daily_Challenge_2026-11-20 (1).zip`
- **Existing files replaced (3):**
  - `app/Domain/AI/Providers/OpenAiResponsesProvider.php`
  - `app/Domain/DailyChallenge/Jobs/QueueDailyChallengeReview.php`
  - `config/pm-ai.php`
- **Files added from the AI source (8):**
  - `app/Console/Commands/CheckDailyChallengeAi.php`
  - `app/Console/Commands/RecoverDailyChallengeDraft.php`
  - `app/Console/Commands/RecoverDailyChallengeReview.php`
  - `app/Domain/DailyChallenge/Services/DailyChallengeModerationProbe.php`
  - `tests/Feature/AI/DailyChallengeModerationProviderTest.php`
  - `tests/Feature/AI/DailyChallengeRecoveryTest.php`
  - `docs/DAILY_CHALLENGE_PRODUCTION_RECOVERY.md`
  - `docs/DAILY_CHALLENGE_SERVER_SYNC_2026_11_20.md`

All other original baseline files have been preserved byte-for-byte. In particular, the newer footer editor, learning courses, course-practice views, exam administration, routes, migrations, and frontend assets remain those of the **Footer Navigation** ZIP, not the older AI ZIP. No database migration is introduced by the AI merge.

## Effective AI behavior

- Daily Challenge generation and member-answer evaluation continue using **`gpt-5-nano`** via the dedicated `OPENAI_DAILY_CHALLENGE_API_KEY` and the Responses API.
- Daily Challenge *input and output moderation only* use the existing **`OPENAI_POST_CHECK_API_KEY`** with `omni-moderation-latest` via the Moderations API. There is no moderation bypass.
- Exam Simulator and its `OPENAI_API_KEY`, PMP prompts, limits, and UI are not changed.
- New readiness probe: `php artisan daily-challenge:check --probe`.
- Exhausted future drafts can be recovered one at a time through `daily-challenge:recover-draft`; an exhausted **same-day** draft is eligible only while its configured publication time is still in the future. Requests require authorized editor identity, a reason and `--execute` for writes.
- Failed unscored review requests can be recovered using `daily-challenge:recover-review`, preserving prior AI requests and deterministic idempotency protection.
- Malformed successful moderation responses fail closed instead of silently being treated as safe.

## Environment and production state are NOT bundled

Do not overwrite production `.env`, PostgreSQL, `storage/app`, uploads, Supervisor, cron, or existing `ai_features`, `ai_prompt_versions`, chat policies, credit balances, editorial settings, or previously published scenarios. This archive includes **no secret API keys**.

The live server's approved setup had `auto_publish=true`, `auto_review=true` and publication time `23:30` Asia/Dhaka. These are **database settings**, not code defaults to reset on redeploy. November 20's scenario was published already; do not recreate it. Existing exhausted drafts may still require careful individual recovery: source deployment alone cannot reset them.

The newer Footer Navigation baseline contains its own learning-related migrations. Compare the server's `php artisan migrate:status` to those migrations and make a database backup before applying any required **non-destructive** migrations. Never use `migrate:fresh` or blanket database resets.

## Validation of THIS merged archive

- ZIP integrity and exact-file comparison: **pass** (all original Footer Navigation files preserved except the three intentional replacements; eight AI files imported).
- PHP syntax checks: **390 PHP files passed**.
- JavaScript static regression tests: **128/128 passed**, including footer navigation, PMP chat and learning contracts.
- PHP static regression scripts: **11 passed, 4 failed**. The exact same four fail on the untouched Footer Navigation baseline; they are unrelated to this AI merge (contact width, PMP review assertion, reward header, footer spacing).
- Full Laravel feature tests and browser end-to-end tests: **not run** (uploaded project excludes Composer `vendor/`, installed dependencies and a test database).

Run the actual Laravel feature tests in a configured **local or isolated staging database**, not against production:

```sh
php artisan test --filter=DailyChallengeRecoveryTest
php artisan test --filter=DailyChallengeModerationProviderTest
php artisan test --filter=DailyChallengeAiTest
php artisan test --filter=AiGatewayIntegrityTest
```

## Safe redeployment reminder

1. Review `git status --short` on server and local. The production AI fixes were originally applied directly on the server and may be uncommitted; reconcile before `git pull --reset` or copying a new ZIP.
2. Preserve live credentials and the database. Back up database and code. Deploy the merged project via the approved Git workflow, not by blindly deleting the live tree.
3. The **newer baseline's frontend** changed. If those frontend changes are being deployed, build the matching assets using an installed compatible Node version and the project's lockfile (`npm ci && npm run build`) in the appropriate build environment, then deploy its matching `public/build` files. This source ZIP does not contain precompiled `public/build` assets.
4. After source deployment, from the live project root: `php8.4 artisan optimize:clear && php8.4 artisan config:cache && php8.4 artisan queue:restart`; verify `supervisorctl status`, `php8.4 artisan pm:post-check-test`, and `php8.4 artisan daily-challenge:check --probe` (expect `MODERATION_AVAILABLE HTTP=200`).
5. Verify the scheduler, next queued draft, publication and one real member answer-review submission. Avoid repeating recovery for already published dates.

The historical `DAILY_CHALLENGE_PRODUCTION_RECOVERY.md` describes the earlier first-stage patch. For current credential routing and same-day recovery behavior use this document and `DAILY_CHALLENGE_SERVER_SYNC_2026_11_20.md` instead.
