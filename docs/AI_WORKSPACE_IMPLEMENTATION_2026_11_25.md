# AI Workspace implementation - 2026-11-25

Baseline: Archive 6.zip. Reference: PM_Circle_AI_Management_Original_Design_Revised.html and supplied PM Circle Design Guidelines. The nine workspace screens are integrated into the existing administration layout; the existing AI settings and PMP question management remain separate.

## Navigation and UI

Routes: /admin/ai/workspace/{overview,providers,keys,models,features,budget,usage,health,audit}. The workspace root redirects to overview. Uses shared AdminLayout, admin choices, button, dialog and table styles and centralized design tokens. Includes real usage aggregates, searchable credential/model registries, feature links, usage CSV and paginated audit logs. No sample metrics are inserted. Exact browser visual parity is not verified.

## Credentials and model management

The five existing credential pools (primary OpenAI, Daily Challenge, Feed Moderation, Gemini and Resume Extraction) retain their server environment fallback until explicitly switched. Multiple encrypted saved credentials per pool are supported, with write-only input, masked suffixes, individual diagnostics, rotation, explicit activation and disabling inactive credentials. Laravel APP_KEY must remain unchanged. Credential activation requires a recent successful probe. A probe checks model-list access or actual Omni moderation, not complete generation access or billing; use feature-specific connection diagnostics to verify the full execution workflow. Only existing trusted OpenAI and Gemini adapters are supported. No arbitrary provider URLs, Anthropic adapter, automatic failover or cross-provider fallback are introduced. Models use the existing allowlist and approved pricing safeguards. Gemini Career Trends model remains server-configured. Never revoke a working key until the replacement has been verified in the relevant feature.

## Budgets and reporting

Daily limits are connected to the existing budget admission mechanisms. Existing member allocation editor remains unchanged. Usage reports summarize recorded gateway and moderation ledger activity; direct operations without ledger records are not included. Historical per-credential cost attribution, independent per-credential daily limits, monthly spending caps and automatic backup/priority routing are not implemented. No simulated values are shown for those capabilities. Health checks are explicit and bounded. Existing feature settings remain the place to configure prompts, schedules and access policies. Standard administrator workspace access is retained; sensitive quota and model price updates keep existing authorization checks.

## Database and deployment

Additive migration: database/migrations/2026_11_25_000004_create_ai_workspace_registry.php (credentials, slots, models, limits). No existing rows removed. Back up database and preserve .env, APP_KEY and storage. Deploy changed files or merge full source, then run:

```sh
composer install
npm ci
php artisan optimize:clear
php artisan migrate
npm run types:check
npm run build
php artisan queue:restart
php artisan route:list --path=admin/ai/workspace
php artisan test --filter=AiWorkspaceTest
```

Existing installations with dependencies can skip installation if lockfiles are unchanged. No reseeding or key regeneration. Ensure queue workers use current source. Compiled assets are not supplied; rebuilding is mandatory. No live deployment performed.

## Verification

365/365 source regression checks passed (three new workspace checks); 31 changed PHP files linted, seven TypeScript/TSX files parsed, CSS token checks passed. Full Laravel feature tests and frontend compilation blocked by missing vendor and node_modules. Four Laravel feature tests authored but not executed. No live provider API requests or browser visual checks performed.

## Affected files

- `app/Console/Commands/AuthorizeAiUsageAdmin.php`
- `app/Console/Commands/CheckDailyChallengeAi.php`
- `app/Console/Commands/ConfigurePmpAiChat.php`
- `app/Console/Commands/RecoverDailyChallengeDraft.php`
- `app/Domain/AI/Providers/GeminiTrendProvider.php`
- `app/Domain/AI/Providers/OpenAiResponsesProvider.php`
- `app/Domain/AI/Services/AiAdminAccess.php`
- `app/Domain/AI/Services/AiBudgetService.php`
- `app/Domain/AI/Services/AiFeatureCatalog.php`
- `app/Domain/AI/Services/AiGateway.php`
- `app/Domain/AI/Services/AiRuntimeSettings.php`
- `app/Domain/AI/Services/AiWorkspaceCredentials.php`
- `app/Domain/AI/Services/CvExtractionService.php`
- `app/Domain/AI/Services/FeatureConnectionStatus.php`
- `app/Domain/AI/Services/PostCheckBudget.php`
- `app/Domain/AI/Services/PostContentCheckService.php`
- `app/Domain/AI/Services/TrendAiConnection.php`
- `app/Domain/Community/Services/PostCheckPolicy.php`
- `app/Domain/DailyChallenge/Services/DailyChallengeModerationProbe.php`
- `app/Domain/DailyChallenge/Services/DailyChallengeSettings.php`
- `app/Http/Controllers/Account/ResumeAssistantController.php`
- `app/Http/Controllers/Admin/AI/AiManagementController.php`
- `app/Http/Controllers/Admin/AI/AiWorkspaceController.php`
- `app/Http/Controllers/Admin/AI/FeatureSettingsController.php`
- `app/Http/Controllers/Admin/DailyChallenge/DailyChallengeController.php`
- `app/Providers/AiServiceProvider.php`
- `app/Providers/AppServiceProvider.php`
- `bootstrap/app.php`
- `database/migrations/2026_11_25_000004_create_ai_workspace_registry.php`
- `resources/css/app.css`
- `resources/css/pm-ai-workspace.css`
- `resources/js/components/admin/ai/ConnectionControls.tsx`
- `resources/js/components/admin/ai/SettingsShared.tsx`
- `resources/js/components/admin/ai/WorkspaceShared.tsx`
- `resources/js/components/admin/ai/workspace-navigation.ts`
- `resources/js/layouts/admin/AdminLayout.tsx`
- `resources/js/pages/admin/AiWorkspace.tsx`
- `resources/js/pages/admin/CareerTrendSettings.tsx`
- `routes/web.php`
- `tests/Feature/AI/AiWorkspaceTest.php`
- `tests/Regression/aiWorkspace.test.mjs`
- `tests/Regression/featureAiSettings.test.mjs`
