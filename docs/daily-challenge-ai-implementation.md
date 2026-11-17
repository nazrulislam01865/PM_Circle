# PM Circle — Daily Challenge AI (GPT-5-nano)

## Functional scope

- Existing Laravel AI gateway remains authoritative for authentication, model policy, structured output, moderation, budgets, token/cost accounting, outbox, queues and AI history.
- **Only** `scenario_generate` and `daily_challenge_review` use `OPENAI_DAILY_CHALLENGE_API_KEY`. PMP and other features retain `OPENAI_API_KEY` and their existing policies.
- Challenge generation uses the existing editorial draft and `ai_requests` systems. Each Dhaka calendar date has one unique `ai_editorial_drafts.slot_key` and one unique `scenarios.daily_slot`.
- The administrator chooses whether AI generation is enabled, whether a validated draft is automatically published at its scheduled time, whether member responses are automatically evaluated, the default expiry duration (1–168 hours), and daily per-member review limit (1–50).
- Admins with `ai.manage_editorial` can override the expiration of an individually published challenge. Closing disables new responses but preserves existing community discussions and assessments.
- AI review is free to members. Only top-level responses to published AI daily challenges are evaluated; nested community replies are not. A **10-point rubric** is stored with the scenario, evaluated per criterion, validated and summed on the server. Zero remains a valid score.
- The scenario and response UI reuse existing pages. Feedback appears asynchronously, and the submitting member's page polls its current response list for a limited period.

## Deployment sequence (on the PM Circle server)

1. Deploy source code, keep the dedicated API key server-side. Obtain a *separate* restricted OpenAI project API key for this feature. The key needs `/v1/responses` **Write**, `/v1/moderations` **Write** (both prompt and result undergo moderation), and optionally `/v1/models` **Read**. No Agent/Assistant, file, fine-tuning or administration permissions are required.
2. Configure `.env` (examples only, never commit actual secrets):

   ```dotenv
   PM_AI_ENABLED=true
   PM_AI_EDITORIAL_ENABLED=true
   OPENAI_DAILY_CHALLENGE_API_KEY=<your_new_restricted_project_key>
   PM_AI_ALLOWED_MODELS=gpt-4.1-mini,gpt-4.1,gpt-5-nano
   PM_AI_GLOBAL_DAILY_BUDGET_USD=5
   PM_AI_EDITORIAL_DAILY_BUDGET_USD=1
   PM_AI_QUEUE=ai-interactive
   PM_AI_EDITORIAL_QUEUE=ai-editorial
   ```

   If PMP already uses `gpt-5-nano`, preserve the current allowed models and append missing ones instead of replacing the list. Keep existing `OPENAI_API_KEY` and all unrelated AI settings intact. The budget examples are **not** a recommendation of a particular spending level; size budgets according to expected member submissions and request volume.
3. Back up PostgreSQL before migrations. Execute:

   ```bash
   php artisan migrate --force
   php artisan db:seed --class=DailyChallengeAiSeeder --force
   php artisan optimize:clear
   php artisan config:cache
   php artisan route:cache
   php artisan schedule:list
   ```

   Seeder is idempotent; it creates missing safe prompts and the GPT-5-nano price row, enables the two new Daily Challenge features, and preserves existing prompts and pricing. The two Daily Challenge features use GPT-5-nano. It **does not** turn on automatic publication or evaluation; those remain admin choices.
4. Ensure the existing system cron runs `php artisan schedule:run` every minute and a supervised Redis/Horizon worker is consuming **both** `ai-editorial` and `ai-interactive`. Restart supervised queue workers after deployment (`php artisan queue:restart` and the relevant Supervisor/Horizon process procedures). Do not start a duplicate scheduler if one already exists.
5. Grant `ai.manage_editorial` only to the designated administrator, if not already granted:

   ```bash
   php artisan ai:admin-permission <admin_user_id> ai.manage_editorial
   ```

6. Visit `/admin/ai/daily-challenge`, confirm every integration-readiness check, save publication time in **Asia/Dhaka**, choose expiration hours and review caps, and enable automation.
7. Run `php artisan ai:prepare-scenarios` to prepare today and the next seven days. The scheduler subsequently prepares slots, publishes completed due drafts every five minutes, and closes expired scenarios every minute. Use `php artisan daily-challenge:publish` and `php artisan daily-challenge:expire` for read-safe operational recovery if cron was interrupted. These commands never delete responses.
8. Verify an actual daily scenario, an authorized member response, the resulting AI request's completion, a **0–10** score/feedback, and closure after a test expiry. Verify PMP requests continue to use their prior key. Monitor AI request statuses and USD usage. No live provider calls, database migrations or production deployment were performed while preparing this patch.

## Safety and operational notes

- Automated publication is a deliberate admin opt-in; the original human editorial approval workflow remains available when it is off. Daily Challenge automation never auto-publishes trend articles.
- Missing key, disabled gateway, disabled editorial configuration, unapproved model price, invalid rubric, moderation refusal or exhausted provider budget fails closed. Content remains draft/failed; a successfully posted community response is not lost when its AI review fails.
- AI editorial generation failures may be retried up to three times per date through the existing durable request ledger. A `provider_status_unknown` must be manually reconciled rather than blindly replayed.
- Only response ownership is accepted for scoring. A member cannot supply their own rubric, score, prompt, model or provider key through HTTP. Response review admission is idempotent using a stable UUID per response. Review limit is enforced under the existing per-user DB lock.
- The admin UI never returns any key, encrypted raw prompt or private review data. Feature-level permissions and audited admin settings/expiry mutations use existing `AiAdminAccess`.
- Server-enforced `expires_at` prevents posting even when closure scheduling is temporarily delayed. Old challenges remain readable. The member-facing score is explicitly educational, not an official PMI/PMP certification grade.

## QA commands

```bash
php artisan test --filter=DailyChallengeAiTest
php artisan test --filter=AiGatewayIntegrityTest
php artisan test --filter=ScenarioDiscussionReplyTest
npm ci
npm run types:check
npm run build
php artisan schedule:list
```

### Database impact

New table `daily_challenge_settings`; new `scenarios.daily_slot`, `scenarios.expires_at`; new `scenario_responses.ai_review_status`; new `ai_editorial_drafts.generation_attempts`. `scenario_rubric_versions.approved_by` becomes nullable to truthfully record automated publications without misattributing staff approvals. All existing rows are retained. The rollback intentionally leaves rubric approval nullable so it cannot invalidate previously automated records.
