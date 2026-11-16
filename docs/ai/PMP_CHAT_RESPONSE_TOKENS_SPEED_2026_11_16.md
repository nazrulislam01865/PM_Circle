# PM Circle PMP Question Tutor: follow-up quality, tokens and performance

Scope: PMP completed-question chat only (`pmp_explain`, `pmp_followup`). No changes to scoring, answer keys, other AI features, payments, or subscription prices.

## Corrections

- Response relevance: backend puts the single completed question in a reference-data turn, then up to six bounded recent member/assistant turns, and finally the **latest member message**. Prior assistant `nextStep` is retained in the conversational context to resolve questions such as “What is the purpose of this?” The versioned tutor prompts now require answering the latest question directly rather than repeating option rationales. Assistant `nextStep` may be `null` when no relevant study suggestion exists.
- Latency: GPT-5 nano PMP requests use `reasoning.effort=minimal` by default, `text.verbosity=low`, and output caps of 1,200 (initial) and 1,000 (follow-up) tokens. Cached recent history is trimmed to six messages (700 characters per turn). These settings can improve latency but **no live latency benchmark** was run in this delivery.
- Token allocation: PMP chat policies have a `max_cycle_tokens` allowance, with optional per-user override. The member chat shows allocated, used, reserved and remaining **actual OpenAI provider tokens** for the member's subscription cycle. Provider usage includes input plus output tokens, where output includes hidden reasoning; cached input is already part of input. A completed response displays its own input/output tokens.
- Financial separation: PMP token allocations are **not** PM Circle credits and **not** the OpenAI API project spending cap. Credit pricing may remain at zero for local testing. Existing global USD budget and chat-count policies remain active.
- Safety: server checks member ownership, Plus/Pro entitlement and completed exam status; only the selected question is loaded server-side. Input length, schema validation, model allowlist, per-minute, daily, per-question and concurrent limits remain enforced. Messages are stored encrypted; API keys remain server-side. The no-moderation-endpoint testing mode has lower content classification coverage than enabling external moderation.

## Database impact

Additive migration: `database/migrations/2026_11_16_030000_add_pmp_ai_token_usage.php`.

- Adds `max_cycle_tokens` to `ai_chat_limit_policies` and `ai_chat_user_overrides`.
- Adds `used_tokens` and `reserved_tokens` to the existing indexed chat-usage bucket.
- Adds `ai_pmp_token_allocations` (idempotent request-linked settlement) and `ai_pmp_token_events` (append-only reserve/settle/release records).

A successful GPT-5 nano response settles exact `input_tokens + output_tokens`. Failed/cancelled operations release outstanding reservations. In-flight estimates deliberately reserve more than expected; these are not final charges. If exact actual usage exceeds an estimate, the actual total is still recorded and remaining is floored at zero until the cycle resets. There is no way to guarantee exact provider token usage before receiving a model response.

## Local activation / update

1. Back up the database, apply changed source, and run `php artisan migrate`.
2. Confirm local `.env`: `APP_ENV=local`, `PM_AI_ALLOWED_MODELS=gpt-5-nano`, `PM_AI_PMP_EXTERNAL_MODERATION=false`, `PM_AI_GLOBAL_DAILY_BUDGET_USD=1`. Keep the API key solely in `OPENAI_API_KEY`. Enable `PM_AI_ALLOW_DEMO_CREDIT_GRANTS=true` **only** if testing complimentary Plus/Pro memberships locally.
3. Run `php artisan optimize:clear` and **rerun** `php artisan pm-ai:setup-pmp-chat --local-test`. This publishes the updated tutor prompts, sets the new token allowance (50,000 tokens/cycle on Plus and Pro for local tests), and reduces GPT-5 nano output limits. It does not enable credit purchases or other AI features.
4. Reconstruct token use from existing completed chat records with `php artisan pm-ai:backfill-pmp-tokens --dry-run` followed by `php artisan pm-ai:backfill-pmp-tokens`. This reconciliation is idempotent, only updates PMP cycle usage counters, and does not touch messages or credits. Do this with the worker paused for a consistent first reconciliation.
5. Set `PM_AI_ENABLED=true` locally, then run `php artisan optimize:clear`, `php artisan queue:restart`, and start `php artisan queue:work --queue=ai-interactive --tries=1 --timeout=65`. Ensure `retry_after > 65` on the queue connection. Existing workers may need restart to pick up the new code.
6. `npm run types:check && npm run build`, refresh the review page, and test with an authorized completed PMP attempt.

Admin: existing authenticated `POST /admin/ai/chat-limits/policies` now accepts `max_cycle_tokens` (required for `feature:pmp`), and per-user overrides can specify `max_cycle_tokens`. Existing admin quota preview includes the token balance for PMP. The platform ceiling is `PM_AI_HARD_PMP_CYCLE_TOKENS` (default 250,000). Change allocations through authorized, audited APIs rather than editing counters by hand.

For later commercial activation, review provider prices, token allowances and credit tariffs, then apply approved versioned policies. The setup command refuses production usage.

## Verification

Run locally with Composer dependencies and a test database:

```bash
php artisan test --filter=AiGatewayIntegrityTest
php artisan test --filter=PmpLocalTestBootstrapTest
php artisan test
npm run types:check
npm run build
node --test tests/Regression/pmpTutorTokenSourceCheck.mjs
```

Manually verify: Ask “What is the purpose of this?” after a tutor turn that mentions integrated change control, confirm a direct purpose-oriented answer rather than option rationales. Switch to another completed question and ensure its chat is separate. Confirm tokens reserved while pending, input+output tokens after completion, refund of reservations after simulated failure, and denial when allocation is exceeded. Test with a second member and an active attempt to ensure 403/404 access restrictions.

**Not verified in this packaging environment:** real OpenAI call, Laravel/PHPUnit integration suite, complete TypeScript typecheck and frontend production build (the uploaded source does not include installed `vendor` and `node_modules`). No production deployment was performed.
