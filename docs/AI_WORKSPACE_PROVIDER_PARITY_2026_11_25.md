# AI Workspace provider and prototype alignment — 2026-11-25

Base: Archive 7.zip. Reference: supplied revised AI Management HTML, screenshots and PM Circle design guideline.

## Root cause and changes
The provider list was hard-coded and Configure navigated to existing feature settings rather than opening a provider editor. The workspace now persists provider profiles, supports Add provider and Configure dialogs, and filters credentials by provider. Existing default OpenAI and Gemini profiles preserve environment-based routing. Additional profiles use trusted fixed adapters. Anthropic is a standby registry entry only, not a live adapter. Active routes cannot be disabled via the provider editor. Adapter identifiers are immutable.

The workspace uses compact shared heading, panel, card, badge, field and modal styles, including three-column provider cards, credential priority and daily spend, model management, usage chart and credential cost breakdown, and health events. Existing PM Circle administration shell and central design tokens are retained; prototype-only banners and fabricated values are not copied.

## Data and execution
Two additive migrations create provider records, associate credentials with providers, and add credential priority, daily budget and moderation attribution fields. Existing credentials are retained. Credential accounting uses the existing budget ledger and reserves estimated spending before supported paid gateway requests; settlement records actual costs when available. Responses-based post moderation uses its existing budget lock and records credential attribution. Omni moderation is exempt; direct CV extraction is outside this accounting path. Earlier usage is not retroactively attributed. Priority is stored but automatic failover is not implemented; tested explicit activation remains necessary. Monthly caps are not implemented. Models are shared by adapter, not duplicated by profile. Gemini execution remains limited to Career Trends. No arbitrary endpoint URLs or unsupported live adapters are permitted.

## Verification
367/367 source regression checks passed using `node --experimental-strip-types --test tests/Regression/*.test.mjs`. Changed PHP, TSX and CSS syntax checks were performed; 47 referenced CSS tokens exist. Laravel feature tests were added/extended but could not be executed without Composer dependencies. Offline npm installation could not resolve an uncached dependency, and the installed Node version is below the Vite Plus requirement. Full typecheck/build remain pending. Browser preview was attempted but navigation was blocked by the environment, so exact pixel-level parity is not verified. No live API requests or production deployment occurred.

## Deployment
Merge the patch into Archive 7's project root; preserve .env, APP_KEY, existing database and uploaded storage. Back up production data before migration. Run `php artisan optimize:clear`, `php artisan migrate`, `npm ci` if needed using a supported Node version, `npm run types:check`, `npm run build`, and `php artisan queue:restart`. Run `php artisan test --filter=AiWorkspaceTest` in an isolated test database, then verify `/admin/ai/workspace/providers` and the Add provider / Configure workflows. Production assets are intentionally omitted from the full source ZIP; rebuild before serving. No reset or seed command is needed.

## Affected files
- `app/Domain/AI/Services/AiBudgetService.php`
- `app/Domain/AI/Services/AiExecutionService.php`
- `app/Domain/AI/Services/AiFeatureCatalog.php`
- `app/Domain/AI/Services/AiRuntimeSettings.php`
- `app/Domain/AI/Services/AiWorkspaceCredentials.php`
- `app/Domain/AI/Services/AiWorkspaceProviders.php`
- `app/Domain/AI/Services/PostCheckBudget.php`
- `app/Http/Controllers/Admin/AI/AiWorkspaceController.php`
- `database/migrations/2026_11_25_000005_create_ai_workspace_providers.php`
- `database/migrations/2026_11_25_000006_add_ai_workspace_credential_accounting.php`
- `docs/AI_WORKSPACE_PROVIDER_PARITY_2026_11_25.md`
- `resources/css/pm-ai-workspace.css`
- `resources/css/pm-design-tokens.css`
- `resources/js/components/admin/ai/WorkspaceShared.tsx`
- `resources/js/pages/admin/AiWorkspace.tsx`
- `routes/web.php`
- `tests/Feature/AI/AiWorkspaceTest.php`
- `tests/Regression/aiWorkspace.test.mjs`
