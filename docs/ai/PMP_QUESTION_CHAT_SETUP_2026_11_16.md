# PM Circle: question-scoped PMP AI chat (GPT-5 nano)

## Implemented behavior

On a **completed, owned** exam question's Review page, the existing **Ask AI About This Answer** button expands a small chat panel directly below the explanation. The original explanation tabs, question metadata, score, timer, answer buttons and page layout remain unchanged.

The first AI request can be a typed question, or a blank request to generate an explanation. Later messages are `pmp_followup` turns. A single `(user_id, attempt_id, question_id)` conversation is persisted, so opening another question cannot reuse or view its transcript. Laravel selects exactly that question's prompt, four choices, correct option, selected member answer, explanation, distractor rationale, takeaway, concepts and references. The browser sends only IDs, chat text, a unique idempotency key and an approved maximum credit price. Prior messages for **that conversation** are bounded to the most recent 12. The provider has no tools, no access to the full question bank, and never changes objective scores.

A lazy authenticated `GET /exams/pmp/attempts/{attempt}/questions/{question}/ai-chat` serves saved messages, pending status, configured prices, wallet balance and chat quotas. The frontend posts to existing `POST /ai/requests` and polls existing owner-only `GET /ai/requests/{uuid}`. This uses the existing gateway, atomic credit ledger, chat quota buckets, encrypted storage, queue execution and refund-on-known-failure logic. The review page makes **no chat request until the button is opened**.

## Restricted OpenAI key / safety behavior

`pmp_explain` and `pmp_followup` can run using **only Responses API Write** (Models Read may be useful for diagnostics):

```
OPENAI_API_KEY=<server-only-key>
PM_AI_ALLOWED_MODELS=gpt-5-nano
PM_AI_PMP_EXTERNAL_MODERATION=false
PM_AI_ENABLED=false
PM_AI_PURCHASES_ENABLED=false
PM_AI_EDITORIAL_ENABLED=false
PM_AI_SUBSCRIPTION_GRANTS_ENABLED=false
PM_AI_GLOBAL_DAILY_BUDGET_USD=1
PM_AI_QUEUE=ai-interactive
PM_AI_TIMEOUT_SECONDS=45
```

PMP chat explicitly skips external `/moderations` when configured as above. Other AI features **still require external moderation** and must stay disabled with the restricted key. Input-length limits, completed-attempt ownership, chat quotas, strict prompt boundaries, structured JSON validation, refusal handling, no tools, and safe text rendering remain enforced. These local measures are **not equivalent** to a dedicated moderation classifier; evaluate content-safety requirements before wider public rollout.

The new provider response must have a complete strict-JSON result and reliable usage metadata or the gateway refunds/reconciles according to the existing transaction policy. GPT-5 nano uses reasoning tokens, so set adequate `max_output_tokens` (development setup sets 1600). The `model` is server-controlled, never supplied by the React client.

## Development/staging setup: no production write

1. Back up your development database. Apply the **additive index migration**:

   ```bash
   php artisan migrate --force
   php artisan optimize:clear
   ```

2. In the [OpenAI model pricing page](https://platform.openai.com/docs/pricing), verify the **current input / cached-input / output USD-per-million-token rates** for `gpt-5-nano`. Obtain approved PM Circle member credit costs and chat quotas. **Do not substitute provider tokens for PM Circle credits.**

3. Populate the two **PMP-only** feature rows, versioned prompts, price snapshot and Plus/Pro limits using the development-only command. Every economic parameter is explicit; replace the placeholders with numbers you have approved:

   ```bash
   php artisan pm-ai:setup-pmp-chat \
     --model=gpt-5-nano \
     --input-rate=YOUR_INPUT_USD_PER_M \
     --cached-rate=YOUR_CACHED_USD_PER_M \
     --output-rate=YOUR_OUTPUT_USD_PER_M \
     --explain-credits=YOUR_APPROVED_FIRST_COST \
     --followup-credits=YOUR_APPROVED_FOLLOWUP_COST \
     --daily-limit=YOUR_APPROVED_DAILY_CAP \
     --cycle-limit=YOUR_APPROVED_CYCLE_CAP \
     --question-limit=YOUR_APPROVED_PER_QUESTION_CAP \
     --concurrent-limit=1
   ```

   The command **refuses to run in `production`**. It does not grant member credits, enable other AI features, enable production payments or change subscription pricing.

4. For local review, use a user with a **real eligible Plus/Pro subscription**, or explicitly set `PM_AI_ALLOW_DEMO_CREDIT_GRANTS=true` in local development **only** if testing the demo membership switch. Grant an intentionally limited test credit balance with the existing `AiCreditService`; use a unique test source reference. Example (replace email before running):

   ```bash
   php artisan tinker --execute='$user = App\Models\User::where("email", "local-test-member@example.com")->firstOrFail(); app(App\Domain\AI\Services\AiCreditService::class)->grant($user->id, "local_test", "pmp-chat-test-2026-11-16", 10, now()->addWeek()); echo "Local test credits added once.\n";'
   ```

5. Enable only in development/staging after step 3:

   ```env
   PM_AI_ENABLED=true
   ```

   Run `php artisan optimize:clear`, then start a separate queue worker:

   ```bash
   php artisan queue:work --queue=ai-interactive --tries=1 --timeout=65
   ```

   Configure `retry_after` **greater than worker timeout** and check it in `config/queue.php`. On a synchronous local queue, the external request executes in the web request; use a database/Redis worker for realistic asynchronous testing.

6. Log in to a Plus/Pro test account, **complete** a mock exam, open Review, click **Ask AI About This Answer**, read the exact cost, and ask about the current question. Follow up, switch to another question (separate conversation), return to the original question (persisted history). Verify balances and quotas at `/ai/wallet` and `/ai/limits?feature=pmp`.

### Validation commands

```bash
php artisan route:list --path=ai
php artisan route:list --path=exams/pmp
php artisan test --filter=AiGatewayIntegrityTest
php artisan test --filter=PmpPersonalDashboardTest
php artisan test
npm ci
npm run types:check
npm run build
```

The uploaded source archive excludes Composer `vendor` and NPM `node_modules`. Install dependencies in your own working directory. The AI provider's real integration must be tested locally against your actual restricted key; tests use `Http::fake` or an injected fake provider and do **not** spend API money.

### Acceptance/regression checks

- Anonymous, Free, unverified, unonboarded, other user's, and active/uncompleted attempt access is denied.
- Initial explanation and follow-ups use only the current owned question (and its own history).
- A second tab cannot start another in-flight turn in the same conversation.
- Repeated request keys do not double-charge or consume multiple chat slots.
- Limits apply across questions, tabs, devices and subscription cycles; message cost is shown before submission.
- Replies remain visible after reload, successful results settle exactly once, failures release reservations.
- No external moderation call for configured PMP features; all unrelated AI features keep their previous moderation requirements.
- Existing deterministic scores, timers, tab text, choice rendering, and non-AI pages remain unchanged.

## Production caution

**Do not run the staging setup command in production.** Use the existing audited `admin/ai` JSON endpoints to publish model prices, prompt versions, per-feature tariffs and quotas after product/security approval. Verify actual provider costs, concurrency, data retention, worker health and the integration test suite. Keep purchases, unrelated AI features and any automated editorial publication disabled until separately authorized.
