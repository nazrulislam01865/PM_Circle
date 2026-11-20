# PM Circle — Daily Challenge production recovery (2026-11-19)

## Evidence and scope

- Local scenario generation using `gpt-5-nano` completes; local answer evaluation failed with `MODERATION_UNAVAILABLE`.
- Production's dedicated Daily Challenge key returned HTTP **403 Forbidden** for both `omni-moderation-latest` and the dated moderation model. The normal API key did too. The same denial occurred locally. **This is an external authorization failure that cannot be repaired by changing Laravel code.**
- On production the next eight `daily-scenario:YYYY-MM-DD` drafts had reached the three-attempt limit. Do not reset past dates or retry ambiguous provider operations.
- Production Exam Simulator `pmp_explain` and `pmp_followup` were already verified successful. This patch does not alter PMP chat or its pricing/policies.

## Patch files

1. `app/Domain/DailyChallenge/Services/DailyChallengeModerationProbe.php` — synthetic Moderations API capability check; does not expose credentials or private text.
2. `app/Console/Commands/CheckDailyChallengeAi.php` — read-only readiness and failed-work dashboard; `--probe` makes one benign Moderations call.
3. `app/Console/Commands/RecoverDailyChallengeDraft.php` — exact future-date recovery only. Requires a verified administrator with `ai.manage_editorial`, a reason, `--execute`, external Moderations HTTP 200 and no ambiguous request. Recomputes publication time from the current settings and submits via the existing budgeted AI gateway in the same transaction. Permits one audited manual recovery per draft, preserving old request history.
4. `app/Console/Commands/RecoverDailyChallengeReview.php` — audited retry for exactly one failed, unscored top-level member response. Refuses previously completed, in-flight or ambiguous AI requests. No scores invented or modified.
5. `app/Domain/DailyChallenge/Jobs/QueueDailyChallengeReview.php` — preserves original request idempotency for a first attempt; creates a **new deterministic key** only for manually restored reviews with earlier terminal failed attempts. Refuses duplicate in-flight operations.
6. `app/Domain/AI/Providers/OpenAiResponsesProvider.php` — requires a boolean `results[0].flagged` on both input and output moderation checks; malformed HTTP 200 JSON now fails closed.
7. `tests/Feature/AI/DailyChallengeRecoveryTest.php` and `tests/Feature/AI/DailyChallengeModerationProviderTest.php` — regression tests.

**Database impact:** no migrations and no table changes. Recovery operations change only the targeted draft/response and append the approved audit/new request records. Existing AI budgets/credits follow existing gateway logic.

## Before deployment

1. Compare the two modified existing source files with the current repository. Merge instead of overwriting if production has newer changes.
2. Back up the existing PostgreSQL database through your established database backup process.
3. Apply the patch to the local Laravel project and run:

   ```bash
   php -l app/Domain/AI/Providers/OpenAiResponsesProvider.php
   php -l app/Domain/DailyChallenge/Jobs/QueueDailyChallengeReview.php
   php artisan test --filter=DailyChallengeRecoveryTest
   php artisan test --filter=DailyChallengeModerationProviderTest
   php artisan test --filter=DailyChallengeAiTest
   php artisan test --filter=AiGatewayIntegrityTest
   php artisan list | grep daily-challenge
   ```

4. Deploy only reviewed patch files. Do **not** change production `APP_ENV`, disable Moderations, or touch PMP features.
5. After deploying PHP code to the server:

   ```bash
   cd /var/www/pm-circle
   php8.4 artisan optimize:clear
   php8.4 artisan config:cache
   php8.4 artisan queue:restart
   supervisorctl status
   php8.4 artisan list | grep daily-challenge
   php8.4 artisan daily-challenge:check --probe
   ```

## Restore OpenAI Moderations access — external blocker

The currently tested dedicated key returns HTTP 403. In the OpenAI API Platform, inspect the **exact project** owning `OPENAI_DAILY_CHALLENGE_API_KEY`, its Members and API Keys permissions, the key's allowed Moderations request scope, model-capability permissions if required by the organization's RBAC, and any project restrictions. If no correction restores HTTP 200, request OpenAI support investigation with the server's latest `x-request-id`; **never send the API key**. Once corrected, rotate/update the dedicated key only if necessary, then recache Laravel config. Do not replay any requests until `daily-challenge:check --probe` returns success.

## Current scheduling difference

Local `publish_time` is 08:00 Asia/Dhaka; production was 23:30 Asia/Dhaka. Set the desired publication time through the **existing admin Daily Challenge settings page** before recovering future slots. The recovery command recalculates the timestamp using that approved setting. It intentionally refuses today's and historic slots to avoid mass publishing of missed days.

## Recover one future Daily Challenge after `--probe` succeeds

The following commands are examples for **November 20, 2026**; use a date that is still **strictly in the future in Dhaka** when you run them.

1. Find an authorized editorial admin ID:

   ```bash
   php8.4 artisan tinker --execute='dump(DB::table("ai_admin_permissions")->where("permission", "ai.manage_editorial")->get(["user_id", "permission"]));'
   ```

2. Dry-run one date:

   ```bash
   php8.4 artisan daily-challenge:recover-draft 2026-11-20
   ```

3. After the moderation probe returns HTTP 200 and you have confirmed the date and administrator's permission:

   ```bash
   php8.4 artisan daily-challenge:recover-draft 2026-11-20 \
     --actor=AUTHORIZED_EDITORIAL_ADMIN_ID \
     --reason="Recover failed future scenario after provider access restoration" \
     --execute
   ```

4. Verify the exact new request, not just the queued job:

   ```bash
   php8.4 artisan tinker --execute='dump(DB::table("ai_editorial_drafts")->where("slot_key", "daily-scenario:2026-11-20")->get(["id", "status", "generation_attempts", "request_id", "publication_at"]));'
   php8.4 artisan tinker --execute='dump(DB::table("ai_requests")->where("feature_code", "scenario_generate")->orderByDesc("id")->limit(5)->get(["id", "subject_id", "status", "error_code", "model"]));'
   ```

5. The new draft must transition `queued` -> `pending_review`. If request admission fails, the atomic recovery rolls back, preserving the exhausted draft. At the approved publication time, existing `daily-challenge:publish` will publish if auto-publish remains enabled. Recover other **future** slots only after one slot succeeds. Do not backfill old dates.

## Recover a failed answer evaluation

First inspect the exact failed IDs without private content:

```bash
php8.4 artisan tinker --execute='dump(DB::table("scenario_responses")->where("ai_review_status", "failed")->whereNull("ai_score")->get(["id", "scenario_id", "ai_review_status"]));'
```

Then, only after the probe succeeds:

```bash
php8.4 artisan daily-challenge:recover-review RESPONSE_ID
php8.4 artisan daily-challenge:recover-review RESPONSE_ID \
  --actor=AUTHORIZED_EDITORIAL_ADMIN_ID \
  --reason="Retry failed answer feedback after provider access restoration" \
  --execute
```

Verify a **new** `daily_challenge_review` request eventually becomes `completed`, and the response gets `ai_review_status=completed`, `ai_score` in 0..10, and educational feedback. Prior failed requests remain unchanged. A content-rejected or ambiguous request is **not** retried. If a queue dispatch is uncertain, the answer remains queued and must be inspected before manual intervention.

## Safety and operational guarantees

- No production Moderations bypass, no `APP_ENV=local`, no API key exposure, no content replay from ambiguous requests.
- No bulk repair command, repeated manual reset of the same draft, or automatic reactivation of exhausted slots.
- No modifications to the user's original answer, published scenarios, score rubric, PMP, other AI features, subscription credit policy, or pricing.
- Service administrator permissions and audit log required for every write.
- New editorial and member AI requests still use existing limits, credits, budgets, durable queue, input validation and the dedicated Daily Challenge key.
- Correcting the external HTTP 403 restriction is a required prerequisite, not a side effect of this patch.

## Verification available in the supplied archive environment

All included PHP files can be syntax-linted, but the attached source archive does not contain `vendor/` or a runnable test database. The new Laravel feature tests must run on the developer's real local project (with Composer dependencies) and **must pass before production deployment**. No live server files, `.env`, or database entries were changed while building this patch.
