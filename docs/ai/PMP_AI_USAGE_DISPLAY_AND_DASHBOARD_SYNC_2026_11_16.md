# PM Circle — PMP AI Chat Display and Usage Synchronization

## Root cause

The PMP Exam Simulator dashboard still read the legacy `pmp_ai_credit_events` table through `PmpQuestionHelpService::summary()`. The active GPT-5 nano tutor uses the separate centralized AI gateway: `ai_chat_usage_buckets` and `ai_pmp_token_allocations`. As a result, the dashboard showed zero while the tutor recorded genuine token usage.

## Implementation

- The question tutor no longer renders credit/reply-count badges, the allocated/used/reserved/remaining token bar, or token counts beneath individual assistant messages. It retains server-side credit confirmation and quota enforcement. If actual member credit charges become nonzero, the send form still shows the charge clearly before sending.
- The question-specific read-model no longer joins `ai_requests` simply to fetch per-message usage; encrypted messages and ownership validation remain unchanged.
- The PMP Overview card is simplified to an AI Tutor description and the existing `View AI Usage` action. Numerical usage is available in the dedicated AI Usage tab rather than being repeated in the overview and chat.
- The member dashboard now uses `PmpAiUsageReadModel`, backed by the authoritative PMP cycle token quota (`AiChatQuotaService::summary`). A single indexed, user-scoped aggregate query reads completed PMP explanation/follow-up tokens for the Activity Ledger. Historical legacy tutoring continues to use its old accounting when that legacy provider is explicitly active.
- An authenticated, plan-restricted `GET /exams/pmp/ai-usage` endpoint lets the AI Usage tab revalidate on open or when the member chooses `Refresh usage`. It returns `Cache-Control: private, no-store` and never accepts a user ID from the client.
- An unconfigured membership policy is reported as unavailable, not misrepresented as a genuine zero allocation.

## Changed files

- `app/Domain/AI/Services/AiChatQuotaService.php` — expose cycle start alongside cycle reset.
- `app/Domain/AI/Services/PmpAiUsageReadModel.php` — new authoritative member usage read model.
- `app/Http/Controllers/Exam/PmpAiUsageController.php` — new private member usage JSON endpoint.
- `app/Http/Controllers/Exam/PmpExamController.php` — stop reading legacy ledger for centralized AI.
- `app/Http/Controllers/Exam/PmpQuestionChatController.php` — eliminate unnecessary message-to-token join.
- `routes/web.php` — add authenticated, rate-limited PMP AI usage endpoint.
- `resources/js/components/exam/PmpQuestionAiChat.tsx` — hide chat counters and per-reply provider usage.
- `resources/js/components/exam/PmpWorkspacePanels.tsx` — simplify overview card, refreshable truthful AI Usage tab.
- `resources/js/pages/exam/Index.tsx` — revalidate usage on tab opening and on explicit refresh.
- `resources/css/pm-pmp-review-prototype.css` — remove unused chat-counter styling.
- `resources/css/pm-pmp-workspace.css` — responsive refresh action using design tokens.
- Relevant regression/feature tests updated and extended.

## Database impact

No migration and no data rewrites. AI quotas, event history, provider token records, and member exam data remain intact.

## Local deployment and validation

Extract the changed-file archive at the Laravel project root (preserving relative directories), then run:

```bash
mkdir -p storage/framework/views storage/framework/cache/data storage/framework/sessions
php artisan optimize:clear
php artisan route:list --path=exams/pmp/ai-usage
php artisan test --filter=AiGatewayIntegrityTest
php artisan test --filter=PmpPersonalDashboardTest
node --experimental-strip-types --test tests/Regression/*.test.mjs
npm run types:check
npm run build
```

No new migration is required. To validate: open a completed question and ask the tutor, return to `/exams/pmp`, then select `AI Usage`. The usage data should reflect that completed request. `Refresh usage` fetches the latest current-cycle snapshot without reloading the whole dashboard. The chat transcript should have no token counts or balance badges.

## Verification scope

Completed in packaging environment: changed PHP file syntax checks, 27 JavaScript regression tests, and TypeScript source parsing. The full Laravel feature suite and Vite build require a correctly installed project `vendor/` and `node_modules/` on the developer machine; they were not successfully run in the packaging environment.

**Safety:** Never disable authorization, remove quota enforcement or expose API keys to implement UI changes. If future member credits cost more than zero, the charge must remain visible before confirmation.
