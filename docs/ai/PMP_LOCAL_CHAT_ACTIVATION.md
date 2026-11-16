# PMP Question AI Chat — local pilot enablement

The uploaded repository cannot change the `.env` or database on your Mac. The changes in this package add an **explicit local-only** shortcut to configure the two existing PMP tutoring features, without setting member subscription pricing or enabling other AI services.

## Local activation (one-time setup)

**Use only your development copy of PM Circle**, with the additive AI migrations already applied. Do not run these steps on production.

1. Keep the existing real OpenAI key in Laravel's private `.env`, and set:

   ```dotenv
   APP_ENV=local
   PM_AI_ALLOWED_MODELS=gpt-5-nano
   PM_AI_PMP_EXTERNAL_MODERATION=false
   PM_AI_ENABLED=false
   PM_AI_GLOBAL_DAILY_BUDGET_USD=1
   PM_AI_QUEUE=ai-interactive
   PM_AI_PURCHASES_ENABLED=false
   PM_AI_EDITORIAL_ENABLED=false
   PM_AI_SUBSCRIPTION_GRANTS_ENABLED=false
   # Only if using the existing temporary Plus/Pro demo membership:
   PM_AI_ALLOW_DEMO_CREDIT_GRANTS=true
   ```

   `PM_AI_ALLOW_DEMO_CREDIT_GRANTS=true` is **not** necessary for genuine active Plus/Pro subscriptions. Never enable this setting for public production traffic.

2. In your local PM Circle project root, run:

   ```bash
   php artisan migrate:status
   php artisan optimize:clear
   php artisan pm-ai:setup-pmp-chat --local-test
   ```

   This activates **only** `pmp_explain` and `pmp_followup` database feature rows and published prompts, plus Plus/Pro quota policies. Defaults are 0 member credits per explanation/follow-up, 10 completed replies/day, 50 per billing cycle, 10 per completed question, and 1 concurrent request. No membership prices, package prices or payment gateways are changed.

   The local-only command adds an accounting snapshot using *reference* GPT-5 nano provider rates (USD per 1 million input/cached/output tokens: 0.05 / 0.005 / 0.40). These values are **not member pricing**. Verify current OpenAI model pricing before a wider rollout; real API charges still apply.

3. When setup succeeds, update **only your local `.env`** to `PM_AI_ENABLED=true` and run:

   ```bash
   php artisan optimize:clear
   php artisan queue:work --queue=ai-interactive --tries=1 --timeout=65
   ```

   Run the queue worker in a separate terminal. For Laravel async queues, configure `QUEUE_CONNECTION=database` or `redis` and set `retry_after` to **greater than 65 seconds**; a `sync` queue processes requests inline and does not need a separate worker.

4. Sign in as a Plus/Pro test member, complete an exam, open Review → **Ask AI About This Answer**. Send a message. The server fetches only that completed question and its answer context. Each follow-up is a distinct quota-counted message in the same question conversation. The first real response can take time; use Refresh chat if necessary.

   If you see **not configured**, check `PM_AI_ENABLED`, the setup command output and whether the user is a real eligible subscriber or a demo Plus/Pro member. If you see **model not allowlisted**, check `PM_AI_ALLOWED_MODELS`. If you see **budget not configured**, set a small positive `PM_AI_GLOBAL_DAILY_BUDGET_USD`. If the response stays **preparing**, check that the correct queue worker is running. **The OpenAI spending limit does not create Laravel member chat policies.**

5. Verify:

   ```bash
   php artisan test --filter=PmpLocalTestBootstrapTest
   php artisan test --filter=AiGatewayIntegrityTest
   node --test tests/Regression/pmpLocalTestActivation.test.mjs
   npm run types:check
   npm run build
   ```

## Disabling the local pilot

Set `PM_AI_ENABLED=false` and run `php artisan optimize:clear`, then `php artisan queue:restart`. No payment configuration or database rollback is needed. Saved replies remain subject to existing access controls. This is a test pilot, **not** a production/public launch. The model's moderation endpoint is disabled for PMP under the existing setting, so local safety controls are narrower than a full moderation integration.
