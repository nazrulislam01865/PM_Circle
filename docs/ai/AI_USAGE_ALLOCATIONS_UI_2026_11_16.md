# PM Circle — AI allocations, member usage and admin field fixes

## Scope / root cause

The AI Usage Management interface previously used a single plan selector for Free/Plus/Pro. Plus and Pro were already distinct in the database, but this editor could make changes difficult to distinguish. The native browser select for AI feature opened as a system overlay that was hard to read on macOS. The browser also required at least eight characters in audit-reason fields, while administrators sometimes enter a short yet valid reason such as "test".

## Changes

- Separate independent Plus and Pro policy editors, each showing its own current and next scheduled policy for the selected feature. Optional Free editor is under a disclosure.
- Separate Plus and Pro monthly member-credit allowance forms (independent of PMP provider tokens).
- Reused the **existing shadcn/Radix Select** component in plan and per-member feature selectors, avoiding the native browser popup and maintaining keyboard accessibility.
- Removed the **eight-character minimum** on audit reasons in the AI Usage Management mutation endpoints, while retaining non-empty required reasons, length caps, administrator permissions, audit records, server-side limits and transactions.
- Removed the needless minimum length on the administrator-issued external credit reference; **uniqueness/idempotency and amount limits are retained**. Do not reuse a reference for a different credit grant.
- Added explicit usage explanations and effective token summary: allocated, used, reserved, remaining per member.
- Improved member lookup presentation to make clear that a member override replaces only the specified plan policy fields. Blank fields inherit the plan; overlaps remain prohibited.
- Corrected UTC parsing for published policy/allowance timestamps in the UI.
- Admin member details now return an informative `NOT_ENTITLED` state when a user has a policy but no eligible AI subscription, instead of causing an entire member-view error.
- Reject PMP-only token allocations submitted for the general Ask AI scope at the backend, even if a caller bypasses the UI.

## Meaning of each field

| Field | Meaning |
|---|---|
| Membership plan — Plus / Pro | Separate member cohorts. Editing Plus does not change Pro. |
| PMP question tutor | The exam-review chat for one completed PMP question. |
| Ask AI (general assistant) | A separate conversational AI feature; does not grant PMP tokens. Feature availability is controlled elsewhere. |
| Replies / day | Count of AI replies a member may request in a local-day window. |
| Replies / billing cycle | Count of AI replies over the member's subscription cycle. |
| Replies / conversation | Count allowed inside one chat/question thread. |
| Concurrent requests | In-flight AI replies allowed simultaneously. |
| Tokens / billing cycle | Actual model input+output tokens, including reasoning, available for PMP tutoring in a subscription cycle. |
| Monthly member credits | Internal PM Circle credit units; **not** OpenAI tokens, and does not set subscription or OpenAI prices. |
| Individual member override | Overrides selected limit dimensions for one member; does not add tokens cumulatively to their plan. |
| Effective from / Expires | Determines when a plan policy or individual override applies. |
| Reason | Required audit note, with no eight-character minimum. |

**OpenAI API project spending limits remain outside PM Circle's allocation system**. Changing these forms cannot alter the OpenAI project's spending cap, enable the API feature, change subscription entitlements, or issue membership rights.

## Affected files

1. `resources/js/components/admin/ai/AiAllocationEditors.tsx` — new reusable plan editor, credit editor and accessible AI feature picker.
2. `resources/js/pages/admin/AiUsageManagement.tsx` — independent plan/credit sections, member allocation and usage detail, field text.
3. `resources/css/pm-admin-ai-usage.css` — responsive styling using existing PM Circle tokens.
4. `app/Http/Controllers/Admin/AI/AiQuotaAdminController.php` — audit-reason validation and PMP-only token guard.
5. `app/Http/Controllers/Admin/AI/AiCreditAdminController.php` — audit-reason and external-reference validation; idempotency unchanged.
6. `app/Http/Controllers/Admin/AI/AiUsageDashboardController.php` — graceful not-entitled state for member report.
7. `tests/Feature/AI/AiUsageDashboardTest.php` — tests for independent Plus/Pro policies, short reasons, credit idempotency and scope isolation.
8. `tests/Regression/aiUsageManagementContract.test.mjs` — source-level UI and API checks.

**Database:** No new migrations, table changes or data deletion.

## Local rollout

Apply changed files within the Laravel project root. Do **not** replace `.env`, upload secrets or delete data. Then:

```bash
mkdir -p storage/framework/views storage/framework/cache/data storage/framework/sessions bootstrap/cache
php artisan optimize:clear
php artisan test --filter=AiUsageDashboardTest
php artisan test --filter=AiGatewayIntegrityTest
node --test tests/Regression/aiUsageManagementContract.test.mjs
npm run types:check
npm run build
```

Open `/admin/ai/usage-management` as an admin with `ai.view_reports`, `ai.manage_quotas` and (for credits) `ai.manage_credits`.

Test saving two distinct limits such as 40,000 tokens for Plus and 120,000 for Pro (examples only); confirm they appear in separate records and in the correct plan. For a member, use the **Member usage & overrides** tab and search by name/email, select the user, inspect tokens, and create a specific override. Short audit notes such as "test" should now be accepted. Confirm the Radix dropdown is fully readable on your Mac.

## Verification

- PHP syntax checks passed for changed PHP files.
- Both modified TSX files passed TypeScript syntax parsing using the globally installed TypeScript parser.
- Seven Node source-level regression checks passed.
- Full PHP/Laravel integration tests, project-wide TypeScript type check, real browser validation and Vite build **have not been run in this environment** because the uploaded source archive lacks installed Composer packages and the local npm install is incomplete.

Do not deploy to production until these checks pass in your configured environment.
