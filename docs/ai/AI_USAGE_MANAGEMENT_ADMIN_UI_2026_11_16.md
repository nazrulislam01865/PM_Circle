# PM Circle — AI Usage Management (admin UI)

## Purpose and coverage

Implements the AI Usage Management interface in the existing Laravel 13 + Inertia React 19 modular monolith, styled with the approved `pm-admin.css` and shared design tokens. The page is found under **Admin → AI usage management** at `/admin/ai/usage-management`.

The interface provides:

1. **Overview**: 30-day provider input/output tokens, requests, member-credit consumption, estimated USD cost, current plan quota and next scheduled change, configured system hard ceilings.
2. **Plan allocations**: versioned Free/Plus/Pro policy creation for PMP tutor or Ask AI: daily/cycle/conversation/concurrent reply limits, and PMP billing-cycle tokens. A separately permissioned Plus/Pro monthly credit allowance editor shows current/scheduled values.
3. **Member limits**: explicit bounded member search, effective plan and usage, token allocated/used/pending/remaining, recent request metadata, individual time-limited overrides (including revocation), optional manually audited credit grant.
4. **Reports & audit**: 30-day per-feature/status cost summary and a bounded administrator audit event list. No private resume, prompts, or AI conversation bodies are displayed.

All writes use the pre-existing JSON endpoints (`AiQuotaAdminController`, `AiCreditAdminController`) for server-side validation, lock/transaction guarantees, request auditing, and ID-based ownership. The page only adds read-only views and privileged member lookup. No payment integration, member billing-price changes, AI key exposure, or new AI business logic.

## Security and access

The route group already has `auth`, `pm.admin`, `verified`, and throttling. The page additionally demands `ai.view_reports`. Member search/detail requires `ai.manage_quotas`. Writing quota policies or overrides requires `ai.manage_quotas`; publishing credit allowances and granting individual credits requires `ai.manage_credits`. No permissions are automatically assigned to an administrator. Use the restricted, audited server-console provisioning command:

```bash
php artisan pm-ai:authorize-usage-admin admin@example.com --permissions=reports,quotas,credits --confirm
```

For read-only access: `--permissions=reports`. For quota management: `--permissions=reports,quotas`. To revoke a permission, use `--revoke --confirm` with the targeted `--permissions`. The command requires an **existing active, verified `is_admin` account**. Execute only from a trusted server shell; the command is not available over HTTP. Every real change is audited.

The admin UI cannot override server hard safety ceilings. An effective plan policy does not by itself grant PMP/Ask AI entitlement or enable an AI feature. Member credit pricing and the OpenAI API project's spending cap are separate controls. A manually granted member credit is unrelated to the provider-token count.

## Changed files

- `app/Http/Controllers/Admin/AI/AiUsageDashboardController.php` — read-only bounded reporting, lookup, per-member limits and metadata.
- `app/Console/Commands/AuthorizeAiUsageAdmin.php` — explicit least-privilege AI admin grant/revoke, idempotent and audited.
- `app/Http/Controllers/Admin/AI/AiQuotaAdminController.php` — cross-admin serialization of policy and allowance versions through one shared DB lock row; no changed API contracts.
- `routes/web.php` — three admin-only read routes.
- `resources/js/pages/admin/AiUsageManagement.tsx` — fully interactive admin screens.
- `resources/js/layouts/admin/AdminLayout.tsx` — sidebar entry.
- `resources/css/pm-admin-ai-usage.css`, `resources/css/app.css` — shared-token admin styling and central stylesheet import.
- `database/migrations/2026_11_16_040000_index_ai_usage_reporting.php` — additive `ai_requests(created_at)` index supporting month-long reports.
- `tests/Feature/AI/AiUsageDashboardTest.php`, `tests/Regression/aiUsageManagementContract.test.mjs` — scoped security, policy, endpoint, UI and audit regression coverage.

## Safe local rollout

Backup your code and database as usual; merge changed files without replacing `.env`, storage content or production data. From the project root:

```bash
mkdir -p storage/framework/views storage/framework/cache/data storage/framework/sessions bootstrap/cache
php artisan migrate:status
php artisan migrate
php artisan optimize:clear
php artisan pm-ai:authorize-usage-admin admin@example.com --permissions=reports,quotas,credits --confirm
php artisan test --filter=AiUsageDashboardTest
php artisan test --filter=AiGatewayIntegrityTest
node --test tests/Regression/aiUsageManagementContract.test.mjs
npm run types:check
npm run build
php artisan route:list --path=admin/ai
```

The migration only adds an index. For very large production request histories, schedule index creation in a suitable maintenance window or adapt it to a concurrent PostgreSQL index operation before applying. No destructive database operations are necessary. The existing `ai-interactive` queue worker is required only for *member AI replies*, not the admin usage dashboard.

## Verification in this delivery environment

PHP syntax checks and Node source contract checks can be executed. Laravel integration tests and full Vite builds require Composer dependencies, a configured database, and npm dependencies; those are not supplied by the source ZIP. A timed attempt to install npm dependencies was unsuccessful, and the local Node version 22.16.0 is below the Vite-Plus project's minimum 22.18.0. Treat integration and real browser tests as **pending until run on the target machine**.

## Manual acceptance scenarios

1. Login as a normal member, then as an admin without `ai.view_reports`: both must be denied access.
2. Grant reports only: dashboard loads but member search and writes are denied.
3. Grant quota management: search a member, inspect PMP tokens and daily/cycle usage, schedule a new Plus/Pro policy and confirm the audit event; verify the scheduled change appears and becomes effective at its timestamp.
4. Add one partial override, confirm omitted fields inherit the plan; attempt an overlapping override and confirm rejection; revoke with a reason, confirm effective limits revert.
5. Grant credits with a unique reference; repeat the same reference and confirm it does not double-credit. Ensure only credit-authorized admins can perform the action.
6. Complete a PMP exam and send an AI tutor message, then refresh the admin member view and confirm used/reserved/remaining token counters update, with no exam answer or prompt text exposed.
7. Check desktop, tablet, and mobile layout, keyboard controls and form validation. Run the full test suite and production build before deployment.
