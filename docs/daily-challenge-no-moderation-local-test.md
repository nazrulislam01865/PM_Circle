# Daily Challenge: local generation test with Responses-only API key

This narrowly scoped test change exists only for validating the challenge-generation and publication pipeline on a local PM Circle development installation. It **does not** publish anything by itself and does not disable moderation system-wide.

## Changes

- `config/pm-ai.php` adds the opt-in flag `PM_AI_DAILY_CHALLENGE_SKIP_GENERATION_MODERATION` (default `false`).
- `AiExecutionService` passes `useExternalModeration=false` to the existing provider only when **both** the app environment is `local` and the request feature code is `scenario_generate` and the opt-in flag is true. This skips the external `/v1/moderations` calls for the generated challenge prompt and result. The Responses API, schema/rubric validation, AI budgets, queue processing, administrative publication controls, and expiration checks remain unchanged.
- All other AI features, including `daily_challenge_review` for member responses, continue using their existing moderation behavior. For response scoring, grant the dedicated key moderation permission rather than relying on this generation-only diagnostic flag.

## Local test procedure

1. Copy the three changed code files in this patch into your existing project (preserve any newer changes); do not overwrite `.env`. In local `.env` use:

   ```dotenv
   APP_ENV=local
   PM_AI_DAILY_CHALLENGE_SKIP_GENERATION_MODERATION=true
   ```

   Keep the existing Daily Challenge key, global/editorial budgets, and admin settings. Leave the moderation flag unset or false in non-local environments.

2. Reload Laravel configuration and restart the interactive/editorial queue worker:

   ```bash
   php artisan optimize:clear
   php artisan config:cache
   php artisan queue:restart
   php artisan tinker --execute="dump(['environment' => app()->environment(), 'skip_generation_moderation' => config('pm-ai.daily_challenge_skip_generation_moderation')]);"
   ```

   If `queue:work` is running manually in a terminal, stop it and start it again:

   ```bash
   php artisan queue:work redis --queue=ai-editorial,ai-interactive --tries=3 -v
   ```

3. In a separate terminal, visit `/admin/ai/daily-challenge` and queue **one** challenge for today's Asia/Dhaka date using **Generate a challenge draft**. Do not rerun `ai:prepare-scenarios` repeatedly: it attempts today plus the following seven days. If today's date reached the existing three-attempt retry limit, check the draft status first; do not reset failed rows without understanding whether they were billed.

4. Wait for the `ai-editorial` job to finish. Inspect without exposing the encrypted prompt or key:

   ```bash
   php artisan tinker --execute="dump(DB::table('ai_requests')->where('feature_code','scenario_generate')->latest('id')->limit(5)->get(['id','model','status','error_code','cost_usd']));"
   php artisan tinker --execute="dump(DB::table('ai_editorial_drafts')->where('feature','scenario_generate')->latest('id')->limit(8)->get(['id','slot_key','status','publication_at','generation_attempts']));"
   ```

5. When the draft is `pending_review` and the scheduled publication time has passed, if the administrator enabled **auto_publish**, run:

   ```bash
   php artisan daily-challenge:publish
   ```

   Confirm a scenario appears on the Daily Challenge page. Note: auto-publishing unmoderated AI content is suitable **only for a local smoke test**. Inspect generated content before exposing it to real members. Manual approval remains available by switching off automatic publication.

6. Re-enable external moderation after the test by removing the new `.env` flag (or setting it to `false`) and reloading config. Never deploy the bypass configuration to production.

## QA

```bash
php artisan test --filter=DailyChallengeAiTest
php artisan test --filter=AiGatewayIntegrityTest
php -l config/pm-ai.php
php -l app/Domain/AI/Services/AiExecutionService.php
php -l tests/Feature/AI/DailyChallengeAiTest.php
```

The new feature test uses a fake AI provider. It verifies that skipping moderation is opt-in, local-only, and limited to scenario generation, and that a validated generated draft can publish. It does **not** test live OpenAI connectivity; a real local generation is needed for that.

## Database and deployment impact

No new migrations and no data deletion. Only two existing PHP runtime files, one existing PHP feature test, and this guide are changed. No Laravel or browser-side authorization checks have been weakened.
