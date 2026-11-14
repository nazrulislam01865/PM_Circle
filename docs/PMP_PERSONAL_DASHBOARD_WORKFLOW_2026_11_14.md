# PM Circle — PMP Personal Dashboard and Exam Workflow

Date: 2026-11-14 | Scope: PMP member workspace; payment/refills excluded.

## What is implemented

- **Latest approved update:** The Exam Simulator dropdown contains one **PMP Exam Simulator** link (plus the existing Scrum and BA entries). No "My Dashboard" or "Public PMP page" duplicates. The PMP link sends guests to `/exam-simulator/pmp` and signed-in members to `/exams/pmp/enter`. The guest landing page rejects signed-in requests, including `?preview=1`. Eligible verified/onboarded Plus/Pro users go to `/exams/pmp`; signed-in non-entitled members are directed to `/pricing` rather than a restricted workspace. Administrators retain their separate admin boundary.
- **Overview, Performance, Exam History, AI Usage** now render as **four mutually exclusive prototype-style tabs**. Only the selected panel is mounted; switching tabs is local React state with no additional HTTP request. A horizontal bar includes accessible selected states and arrow-key support; mobile tabs scroll horizontally. There is no left sidebar. Older hash bookmarks still select the corresponding tab, and Review returns to `?tab=history`.
- **Current Plan** is derived from the active subscription's real start/expiry dates. Complimentary development grants have no invented billing dates. Manage Plan reuses the existing `/membership` page; a new payment-driven extension flow is not built.
- **Start a New Mock Exam** always creates a separate attempt. Old in-progress and completed attempts, questions, marks and answers are preserved; a resumed attempt opens by its original ID. Existing question UI and deterministic scoring remain unchanged. Simultaneous starts are serialized per member, and existing rate limits stay active.
- **Your Study Plan** saves the target date to `profiles.pmp_target_exam_date`. Practice recommendations use completed attempt results. A weak-domain focused start uses up to 15 existing active PMP questions; it does not create new content or new exam engines.
- **Performance** defaults to the latest five completed full-length (180-question) mocks. Short practice has a separate filter. Topic totals include unanswered questions in their denominator. Trend point labels/titles show the attempt date and score. Recommendations state their source attempt and are not official PMP/PMI pass predictions.
- **History** shows status, Bangladesh time, duration/used/remaining, score, Resume/Review and expandable answered/unanswered/flagged totals. A private cursor endpoint loads older attempts only on demand, 40 at a time.
- **Review** is read-only and requires an owned completed attempt. The All/Missed/Unanswered/Flagged filters work across question-to-question navigation; Missed includes incorrect and unanswered. Back to Exam History returns to the same dashboard section. The existing explanation and selected/correct answer display are reused.
- **AI Usage** reads server-recorded credit events, not prototype numbers. With `PMP_AI_HELP_ENABLED=false` (default), balances show actual zero/allocation status and AI help returns a clear unavailable response. An optional protected AI-question helper uses OpenAI moderation, schema validation, per-question cache/idempotency, serialized credit reservation, token accounting and refund on API failure. It requires explicit configuration and real token grants. No credit purchase, Stripe, SSLCOMMERZ, callback, or refill handler was added.

## Migration

`database/migrations/2026_11_14_000003_add_pmp_member_study_preferences_and_ai_ledger.php` is additive:

- `profiles.pmp_target_exam_date`, nullable date
- `pmp_ai_credit_events`: member scoped positive allocation/negative consumption ledger with unique `(user_id, reference)` and optional saved answer
- Indexed `(user_id,id)` for descending cursor history

Do not run destructive migration commands (`migrate:fresh`, `migrate:reset`). Existing users, exams, answers and subscriptions remain intact.

## Environment for optional AI help (payment excluded)

The optional AI service is **off** without explicit approval and configuration.

```dotenv
PMP_AI_HELP_ENABLED=false
PMP_AI_MODEL=gpt-4o-mini
PMP_AI_PLUS_INITIAL_TOKENS=0
PMP_AI_PRO_INITIAL_TOKENS=0
# OPENAI_API_KEY must stay server-side; do not add to VITE_* variables.
```

Only enable after approving per-plan token allowances, setting a valid server-side key and testing the credit event flow. A configured initial allowance is granted once per member using a unique idempotency reference. Repeat AI requests for the same completed question use a cached response rather than charging twice. The API is rate limited. No payment action is provided.

## Verification commands

```bash
php artisan optimize:clear
php artisan migrate
npm run types:check
npm run build
php tests/Regression/PmpPersonalDashboardContractCheck.php
APP_ENV=testing php artisan test --filter=PmpPersonalDashboardTest
APP_ENV=testing php artisan test --filter=PmpExamSimulatorTest
```

Run in a **staging database** before deploying. Verify guest public access; signed-in member redirect to workspace or pricing; only one visible dashboard panel at a time; mouse/keyboard tab navigation; return from Review to History tab; separate start/resume; responsive mobile, score trend; persistent date; old attempts via cursor; permission denial for another member's attempt; missing tokens and AI failure refunds; existing exam timer/scoring.

## Known boundaries / non-goals

- The existing exam engine **does not have a Pause action**. Its timer runs continuously, including while the page is away. History time is capped at the exam deadline; it does not fabricate pause intervals. No pause logic was added.
- Full-mock performance uses a bounded recent-attempt window. History is cursor paginated. For exceptionally high activity with over 40 more recent completed short practices, older full mocks are viewable in history but not in the current performance window; a separate server-side historical summary would be a later enhancement.
- AI-credit allocations default to zero until explicitly configured. There is no invented usage, purchase, admin token packs or refill UI.
- Membership extension/checkout still uses the pre-existing membership flows; a paid extension flow was not introduced.
- Source-level PHP/TSX/CSS checks are possible in the provided archive, but the archive has no `vendor` directory or installed frontend dependencies. Full Laravel feature tests, full TS type checks, Vite build, browser and PostgreSQL concurrency tests must run locally/staging.
