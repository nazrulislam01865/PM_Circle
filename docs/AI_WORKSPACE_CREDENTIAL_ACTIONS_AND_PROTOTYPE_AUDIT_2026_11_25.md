# AI Workspace credential actions and prototype audit

Baseline: Archive 8.zip. Reference: PM_Circle_AI_Management_Original_Design_Revised(2).html. Existing PM Circle admin shell and centralized design tokens are retained.

## Root cause and changes

- The Actions cell rendered Edit and Rotate only for database registry credentials. Existing configured environment keys therefore showed only Test. The shared credential action renderer now offers Test, Edit and Rotate for both sources, and Activate for eligible standby credentials. Disabled/unavailable operations remain disabled.
- Environment Edit saves an encrypted managed copy using the server's existing configured key; it does not return the secret to the browser or change `.env`. Test and activate the new record to switch the route. Environment Rotate verifies the replacement at the existing trusted endpoint, then creates a managed standby record. A failed check creates no replacement; explicit activation is required. Existing registry rotation continues to replace the secret only after a successful check. No provider key is automatically revoked.
- Credential pool is now a required text input in the UI, persisted in `pool_label` (max 100 characters), independent of the immutable internal routing slot. The separate Routing target dropdown selects an implemented compatible service. Existing rows without a custom label display their existing default. Editing a label cannot reroute a live request. Provider selection is retained; incompatible provider/slot combinations are rejected server-side.
- Configured environment credentials display at most a four-character suffix (only for keys of at least 12 characters), plus source identification. No raw key or encrypted secret is returned in the table.
- The budget page has its missing Edit global limits button. The overview shows actual global gateway utilization, reservations and registered/active/standby counts. The model add dialog has a real capability selector for supported generation and Omni moderation identifiers; the backend rejects capability mismatches. Model creation respects the selected provider filter. Health statuses no longer show a disabled credential as healthy and environment events show their actual credential name. Compact table action spacing and provider filter width follow the prototype using existing tokens.

## Nine-page comparison

| Page | Checked controls | Production differences from prototype |
|---|---|---|
| AI Overview | Add API key, metrics, seven-day activity, budget summary, feature routing | Actual recorded usage; no invented provider spending caps. Gateway and moderation limits are separate. |
| AI Providers | Add provider, Configure, View keys, provider cards and counts | Only OpenAI/Gemini adapters implemented; Anthropic standby only; existing adapters cannot be changed in place. |
| API Key Management | Search, provider filter, Add, Test, Edit, Rotate, priority, daily cap, status | Custom pool text plus compatible routing target; environment changes produce managed copies; activation requires successful access check. |
| AI Models | Search, provider filter, Add, Edit, capability, status, approved pricing | Only supported text generation and Omni moderation. Existing server allowlist identifiers/availability are protected; no arbitrary embedding/vision adapters or separate model standby state. |
| Feature Configuration | Model/key/route/status and Configure links | Existing feature settings retained. Backup and priority-based automatic failover are not implemented. Existing request-count limits are not falsely shown as dollar budgets. |
| Budget & Token Allocation | Global edit action, daily caps, feature limits, credential limits, member allocation link | No monthly enforcement. Existing global gateway, editorial and Responses moderation limits are separate. Financial permission remains required. |
| Usage & Analytics | Metrics, real activity chart, credential spend, budget progress, Export CSV | Historical attribution only where recorded; direct CV extraction remains untracked. |
| Health & Monitoring | Run health check, Test, health events, request failures and failure handling | Real provider checks; no simulated success, automatic failover or notification system. |
| Audit Logs | Recorded administrative activity, actor, target, time, pagination | No dummy events or secrets. |

## Changed files

- `resources/js/pages/admin/AiWorkspace.tsx`: actions, pool field, model capability, budget header, summaries and status.
- `resources/css/pm-ai-workspace.css`: shared-token table and filter spacing.
- `app/Domain/AI/Services/AiWorkspaceCredentials.php`: pool label persistence, safe masking, verified standby storage.
- `app/Http/Controllers/Admin/AI/AiWorkspaceController.php`: validation, environment import and rotation, capability check, health event names.
- `routes/web.php`: throttled environment rotation route.
- `database/migrations/2026_11_25_000007_add_pool_label_to_ai_workspace_credentials.php`: additive nullable label column.
- `tests/Feature/AI/AiWorkspaceTest.php`: custom label, safe environment import/rotation, model capability tests.
- `tests/Regression/aiWorkspace.test.mjs`: source regressions.
- This document.

## Verification and deployment

Source regression suite: 370/370. PHP lint, TSX transpilation syntax and CSS parsing verified. Runtime integration tests blocked by missing Composer vendor directory; offline npm install blocked by unavailable cached packages, and installed Node 22.16 is below Vite Plus's required 22.18. Full build, typecheck, live API tests and visual browser comparison are not verified.

Preserve `.env`, APP_KEY and storage. Use supported Node version. Run `php artisan optimize:clear`, `php artisan migrate`, `npm run types:check`, `npm run build`, and `php artisan queue:restart`. Test `php artisan test --filter=AiWorkspaceTest` in a dedicated test database. No database reset or reseeding. Existing routes and assignments are unchanged by the migration.
