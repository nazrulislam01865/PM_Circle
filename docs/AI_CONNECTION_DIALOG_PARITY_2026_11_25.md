# AI connection management parity — 2026-11-25

Base: user-provided Archive 5.zip. No changes to exam question management, scoring, feed publication policy, career trend provider selection, AI menu or subscription entitlements.

## Root cause

Career Trends had a provider selector, detailed status, timestamp, two-button action row and a budgeted queued generation test. The three other feature screens used a separate, reduced dialog and GET /models check. A model read permission is not the same as generation or moderation permission; a restricted feature key can permit its production operation while denying model reads.

## Changes

- `resources/js/components/admin/ai/ConnectionControls.tsx`: shared integration card, status indicator and connection dialog contents using the original Career Trends classes and `AdminChoice`. No CSS or new packages. Career Trends keeps OpenAI/Gemini selection and Use selection; the other features display the single server-supported OpenAI provider and Close. Credentials never enter browser state.
- `resources/js/pages/admin/CareerTrendSettings.tsx` and `resources/js/components/admin/ai/SettingsShared.tsx`: both render the same shared components; existing Career Trends generation/polling behavior remains. The feature dialogs handle pending results, actor-owned polling, existing per-feature throttle cooldown and fetch cancellation on unmount.
- `app/Domain/AI/Services/FeatureConnectionStatus.php`: budgeted synthetic generation for the saved primary scenario generation or PMP explanation model. Uses existing `ai_requests`, `AiBudgetService` and `ExecuteAiRequest`, appropriate editorial/interactive queues and production model, key and moderation policy. No member credit deduction or scenario draft/exam attempt is created. Identifies diagnostic requests separately; active requests are reused per admin/feature/configuration, and unknown provider outcomes block repeat admission for that configuration until reconciliation. Successful/failed results are cached for ten minutes and fingerprinted by key, model and relevant server configuration. A changed saved configuration invalidates queued tests before calling the provider.
- Feed moderation in Omni mode runs a real synthetic moderation sample using the existing checker. In Responses mode it retains a non-billable model-access check; a full paid Responses moderation diagnostic would need to be admitted through the separate post/comment-check budget. The UI explicitly distinguishes this from verified generation/moderation.
- `app/Domain/AI/Services/AiExecutionService.php` and `app/Domain/AI/Providers/OpenAiResponsesProvider.php`: diagnostic-only configuration recheck, status caching and safe provider error codes; regular feature execution remains unchanged.
- `app/Http/Controllers/Admin/AI/FeatureSettingsController.php`, `app/Http/Controllers/Admin/DailyChallenge/DailyChallengeController.php`, `routes/web.php`, `app/Providers/AppServiceProvider.php`: existing administrator authorization, audit, readiness, and actor-owned status endpoint; poll counters independent by feature/route. No extra permission or schema change.
- Tests: updated FeatureSettingsTest for synthetic Daily/PMP generation, budget settlement, distinct keys, actor isolation and both feed modes. Shared AI connection source regression checks added; existing source assertions now reference shared controls.

## Scope and limitations

Generation diagnostics consume a small amount of actual provider budget, require the feature/gateway, approved model price, budget and workers to be configured, and test only the saved primary model (not all follow-up/review models). Mandatory moderation follows production policy, including the existing explicit local-only bypass and optional PMP external moderation. Career Trends remains the only feature with a real Gemini provider adapter. Do not add unsupported provider choices or expose server keys.

Verified: 362/362 Node source regression checks, 8 changed PHP files linted and 3 changed TSX files transpiled without syntax errors. Full Laravel tests and frontend build could not run: archive has no vendor/autoload.php or installed vite-plus binary. Visual/browser parity not verified. No live provider calls performed. Full project archive excludes stale public/build and generated session/view/bootstrap/devtool caches; keep your existing environment and uploads. Rebuild before use.

## Local verification/deployment

From the project root with dependencies installed:

```bash
php artisan optimize:clear
npm run types:check
npm run build
php artisan test --filter=FeatureSettingsTest
php artisan test --filter=CareerTrendConnectionTest
php artisan queue:restart
php artisan route:list --path=admin/ai
```

No migration or permission assignment. Ensure `ai-editorial` and `ai-interactive` workers are running before testing.
