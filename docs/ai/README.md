# AI backend rollout / safety switches

This module adds **independent PM Circle service credits**. It never converts legacy `pmp_ai_credit_events.tokens` to PM credits and never issues automatic paid credits from demo memberships. Migrating the legacy ledger requires a separately approved, audited conversion.

Feature records, tariffs, price snapshots, chat policies, model allowlists and editable prompts are database managed. New features default disabled, as do OpenAI access, package checkout, the daily editorial schedule and monthly grants. **The candidate 50/150 monthly allocations and example per-action costs in the master plan are not commercial approvals**; all new features remain off until explicitly configured. There is no genuine payment-verification adapter installed; API endpoints cannot mark a credit order paid from a browser callback.

Use server-only `OPENAI_API_KEY`, `PM_AI_ENABLED=true` only after staging tests. Start a Laravel queue worker for queue `ai-interactive` and register `php artisan schedule:run` every minute. Configure queue retry_after > job timeout. The `ai:recover` command requeues stranded queued requests and holds ambiguous provider outcomes for manual review; it **never** guesses that an upstream timeout was free. Set up verified provider spend caps independently.

Grant admin mutating permissions from privileged server console via the documented `ai:admin-permission` command. Initial quota policies, approved prompts, approved model price snapshots, per-feature entitlements and chargeable tariffs must be explicitly published by an authorized administrator. Never enable feature flags before running `GET /admin/ai` health/report inspection via admin, wallet reconciliation, concurrent reservation tests, and provider contract tests.

For receipts/top-ups, connect the *actual approved payment provider* using a signature and independent paid-transaction verifier. Do not enable purchases until it is registered and tested; no browser redirect is evidence of payment. Editorial drafts require human review and explicit publication. Existing static trends pages and PMP timer/scoring are intentionally untouched.

No payment provider was selected in the approved source, so `AiPaymentGateway` is intentionally bound to `UnconfiguredAiPaymentGateway`. To enable payments, implement a provider-specific gateway with independently verified receipts and sandbox replay/refund tests, then change the service-provider binding. Never enable `PM_AI_PURCHASES_ENABLED` based only on a successful redirect.
