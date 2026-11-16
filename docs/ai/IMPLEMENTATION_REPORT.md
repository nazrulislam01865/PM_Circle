# PM Circle — AI Backend Implementation Report

**Source baseline:** Uploaded `Archive(20261116-130507).zip`.
**Specification:** `PM_Circle_AI_Implementation_Master_Plan_Chat_Limits_Updated(1).docx`, version 1.1, 16 November 2026.
**Deliverable:** Source implementation only; **not deployed**, and **not approved for paid production activation**. Original PM Circle frontend and unrelated features were preserved.

## Implemented backend

- **Central AI gateway:** `app/Domain/AI/Services/AiGateway.php`, `AiExecutionService.php`, `AiSubjectContext.php`, `AiFeatureCatalog.php`; authenticated feature admission, owner-only contexts, unique request keys, encrypted context/results, transaction-safe admission and after-commit queue dispatch.
- **OpenAI provider:** Responses API in `OpenAiResponsesProvider.php`; server-secret credentials, structured JSON answers, explicit input and output moderation, bounded model/output/timeout, usage capture, no storing with provider, and fail-closed errors. Public exam scoring stays deterministic.
- **Credit economy:** `AiCreditService.php`, `AiBudgetService.php`, a wallet/grants/allocations/append-only event ledger, approved price snapshots, budget holds, grant expiration, compensation for chargebacks, idempotent subscription-cycle grants and read-only reconciliation.
- **Chat limits:** `AiChatQuotaService.php`, versioned plan policies, per-account time-limited overrides, global hard ceilings, user-visible Asia/Dhaka day boundaries and actual paid subscription cycles. A conversation/question, feature family, all-chat and concurrency usage bucket is reserved before the provider call, settled only on a validated reply, and released on failure.
- **PMP tutoring:** Existing completed-attempt ownership and question-membership authorization preserved. Initial explanation and follow-up share one immutable exam-question conversation. The legacy PMP raw-token ledger was not dropped or falsely converted into member service credits.
- **Scenarios:** Community responses no longer receive a fake `8/10` score. Versioned rubric validation recomputes the real educational score server-side. Editorial drafts require human approval and a separate publish action; duplicate daily slots are suppressed.
- **Other features:** General Ask AI, consent-based private resume analysis and draft section rewrite without overwriting real qualifications, source-verified PM Trends editorial drafts, admin controls, encrypted conversations, private result polling and audit metadata.
- **Payment groundwork:** Immutable versioned package orders, provider-verification interface, gateway-event idempotency, pending/paid/refund state transitions. **No payment provider is selected or authorized in the specification**; the intentionally unconfigured default adapter rejects payment callbacks and package activation. This is NOT a live checkout integration.
- **Operations:** `ai:recover`, `ai:expire-grants`, `ai:grant-cycles`, `ai:prepare-scenarios`, `ai:publish-approved`, `ai:admin-permission`; scheduler entries are conditional on rollout flags. Existing careers schedule was retained.

## Routes

Member routes, all first-party session/CSRF protected: `GET /ai/features`, `GET /ai/wallet`, `GET /ai/limits?feature=pmp|ask_ai`, `GET /ai/usage`, `POST /ai/requests`, `GET /ai/requests/{uuid}`, `/ai/conversations`, `/ai/resume-drafts` and approved state transitions. Existing completed-PMP help endpoint supports the new request contract after the new gateway flag is turned on.

Admin JSON routes: `/admin/ai`, `/admin/ai/usage`, `/admin/ai/features`, `/admin/ai/prompts`, `/admin/ai/model-prices`, `/admin/ai/chat-limits`, `/admin/ai/chat-limits/preview`, `/admin/ai/chat-limits/policies`, `/admin/ai/chat-limits/overrides`, `/admin/ai/allowances`, `/admin/ai/editorial`, `/admin/ai/packages`, `/admin/ai/credits/reconciliation`, etc. Each action requires `pm.admin` and its separately assigned scope.

Billing routes: `GET /billing/ai-packages`, `POST /billing/ai-checkout`, `GET /billing/ai-orders/{uuid}`; signature-verified `POST /webhooks/payments/{provider}` **only becomes operable after a real verified gateway adapter is developed and approved**.

## Database

One additive migration `database/migrations/2026_11_16_010000_create_ai_core_tables.php` creates **34** AI/accounting/editorial/administration tables and PostgreSQL checks. Existing question banks, purchases, resume originals, profile tables and historic PMP ledger remain in place. **Do not run migration on production before review, database backup and a staging rehearsal.**

## Staged configuration sequence

1. Configure a **separate nonproduction PostgreSQL DB**, Laravel cache/queue, `APP_KEY`, and queue workers. Enable PHP `mbstring`, PostgreSQL PDO, and the dependencies required by the original project.
2. Install the application's existing dependencies: `composer install --no-interaction`, `npm ci` (frontend rebuild only if needed), and `php artisan migrate:status`.
3. In staging, after backup/checking expected schema changes, run `php artisan migrate`, `php artisan optimize:clear`, `php artisan route:list --path=ai` and `php artisan schedule:list`.
4. Grant a trusted **existing admin** a narrowly scoped permission from the server, e.g. `php artisan ai:admin-permission 1 ai.manage_features` (replace 1 with the verified admin user ID); repeat for needed admin actions. Do not grant all permissions casually.
5. With all new flags **OFF**, create disabled feature records, publish strict prompt versions, approved price snapshots, then versioned chat policies, explicit member tariffs and verified paid-plan allowances through the admin JSON APIs. **50/150 monthly credits and sample per-request tariffs were proposals, not approved commercial rates.**
6. Configure `OPENAI_API_KEY` (service project key), `PM_AI_ALLOWED_MODELS`, positive `PM_AI_GLOBAL_DAILY_BUDGET_USD`, strict model/project caps and separate moderation permission. Set Redis worker queues `ai-interactive` and, if used, `ai-editorial`; ensure queue retry-after exceeds the 65-second AI worker timeout.
7. Run the fake-provider and a separate controlled provider sandbox test; verify 100% of ledger, chat quota concurrency, request permissions, failure/refund and exam-scoring regression cases. Run `php artisan test`, `npm run types:check`, `npm run build` and smoke test exact API contracts.
8. Enable `PM_AI_ENABLED=true` **only for the approved test cohort** and update the exam-review frontend to pass `client_request_key` and `accepted_max_credits`; the existing legacy one-click UI cannot silently authorize new charges. Do not enable automatic monthly grants until approved price/expiry policy and legacy ledger reconciliation are complete.
9. Keep `PM_AI_PURCHASES_ENABLED=false` until a named payment provider, independently verified signature/status/amount/currency checks and refund/replay tests are implemented. Keep auto-editorial publication behind approval and `PM_AI_EDITORIAL_ENABLED`.
10. For an authorized production change window, take an independently verified PostgreSQL backup and deploy additive migration first; then deploy source, perform build/tests, `php artisan config:cache`, `php artisan route:cache`, `php artisan view:cache`, `php artisan queue:restart`, verify workers/schedules/reconciliation and monitor the rollout.

Suggested environment switches (values are examples of **disabled** rollout, not an approved operational configuration):

```dotenv
PM_AI_ENABLED=false
PM_AI_PURCHASES_ENABLED=false
PM_AI_EDITORIAL_ENABLED=false
PM_AI_SUBSCRIPTION_GRANTS_ENABLED=false
PM_AI_GLOBAL_DAILY_BUDGET_USD=0
PM_AI_EDITORIAL_DAILY_BUDGET_USD=0
PM_AI_QUEUE=ai-interactive
PM_AI_EDITORIAL_QUEUE=ai-editorial
# OPENAI_API_KEY is set in the server secret manager, never committed.
```

## Verification performed in this workspace

- `php -l` on **283 PHP files** under `app`, `routes`, `database`, `config`, `bootstrap` and `tests`: **passed** without syntax errors.
- Standalone strict-schema catalog check: **passed** for all nine AI feature schema roots.
- Database migration execution: **not run**, because this workspace lacks Composer `vendor/` and PostgreSQL/SQLite PDO drivers.
- Laravel PHPUnit feature/integration tests: **written but not executed** here; eight new targeted tests are in `tests/Feature/AI/AiGatewayIntegrityTest.php`.
- OpenAI API live credentials, provider contract calls, member/role integration, financial concurrency with PostgreSQL, frontend integration and production deployment: **not executed or verified**. This container also lacks PHP `mbstring` for standalone output semantic tests.

## Release blockers / intentionally unapproved functionality

The repository contains a substantial, default-off backend implementation, **not a proven production-ready integration**. Before paid rollout, verify real PostgreSQL migrations, concurrency tests (including all CHAT-01..CHAT-16 cases in the SRS), live staging queue/Responses behavior, app-specific plan/UX compatibility, approved chat limits and prices, legacy PMP ledger migration choices, privacy retention policy, and a specific payment gateway if top-ups are desired. Do not activate paid top-ups or claim full payment integration without the provider contract and tests. Static PM Trends pages are retained; replacing them with a DB-backed frontend is an independent UI/SEO integration and was not silently altered by this backend-only task.
