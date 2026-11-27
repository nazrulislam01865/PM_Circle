# Remaining account settings and shared dropdown alignment

Scope: Account Settings and the existing consumers of its preferences. The privacy stylesheet no longer overrides PMDropdown's flex display. The shared chevron uses automatic inline-start margin; all nine settings tabs and profile privacy use PMDropdown. No schema changes or dependencies added.

## Functional changes
- Learning: existing preference store supplies weekly study target (a goal, not time tracking), recommended course ordering by matching category, default PMP overview/performance view, optional rationale display on completed review. Interview setup choices use the active question catalog and validate against it; obsolete saved selections are normalized. Existing exam timing/scoring is not modified.
- Community: new follows respect the target's opt-out, with a transaction lock shared with preference updates; existing followers can unfollow. Directory actions use a batched eligibility flag. Registered members can download an optional calendar file for the event. Existing anonymous-posting eligibility is preserved.
- AI: member-selected language is included in the centralized member AI request snapshot, preserving the output schema. Existing PMP chat low-balance notices respect the preference; mandatory limit errors remain. Existing AI usage and refill paths are reused. No claim of translation support for all legacy AI routes.
- Billing: authenticated, owner-scoped payment history loads only when opened, ten orders per page, no gateway credentials, private/no-store response. Displays central orders, not tax invoices or legacy external orders. Fixed-term memberships do not auto-renew. Cancellation uses existing support workflow.
- Data: existing settings JSON and support request links remain. Password-confirmed deletion handles PostgreSQL foreign-key restrictions without deleting protected financial or audit history. Deactivation/full export are support-assisted, not automatic.

## Still unsupported
Mention and blocking systems, event contact-sharing and organizer messaging, AI profile personalization and history retention controls, saved payment methods, separate billing email, auto-renewal and tax invoices, automated cancellation/deactivation and full data export. Low-balance notices are limited to PMP chat; weekly study target does not track study minutes. Do not present these options as working services. Existing notification and appearance limitations from previous releases remain.

## Deployment
Apply the changed files to the matching baseline, rebuild frontend assets (`npm run types:check`, `npm run build`), clear/rebuild Laravel caches (`php artisan optimize:clear`, `php artisan optimize`), restart workers (`php artisan queue:restart`) so AI request logic is refreshed. No new migration. Previous migrations must be current. Test authorization, follow/unfollow, preference persistence, active master data, calendar downloads, AI provider responses, and payment history on staging. Never use real payment credentials or destructive account operations for testing.
