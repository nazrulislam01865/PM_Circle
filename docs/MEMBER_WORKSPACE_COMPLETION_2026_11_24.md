# Member workspace — implementation against the approved member prototype

Base: Archive 8(4).zip. Reference: PM_Circle_Member_Prototype_v2(1).html and the user's seven requirements. Design: the HTML design guideline supplied inside the archive.

## Implementation

- Existing exact member sidebar labels, group order, default expanded group, sticky layout, mobile drawer and compact footer retained. The active member sidebar uses the server-projected feature access rather than a client preview plan.
- Existing profile tabs retained. Overview uses the existing real member statistics projection (completed learning activities, distinct scenarios, measured PMP practice time, earned milestones and recorded views). Sample membership/profile completion fallbacks removed; the profile labels distinguish measured practice time from accredited hours.
- PMP access: Plus/Pro. Resume AI: Pro only, as already specified in the existing PlanComparison, PlanSeeder and AiFeatureCatalog; no Plus upgrade was granted. Free and Plus accounts cannot use protected resume AI routes. Public informational preview and non-AI resume import remain separate. The resume workspace uses the existing feature configuration, credit confirmation, explicit consent, owned resume data and queued AI gateway. No model, prompt, API key, price or credit tariff was invented or changed. Private review/draft access checks and queued resume entitlement recheck are implemented; privacy revocation and discard remain available after downgrade.
- `/membership` now renders Plan & usage. `/membership?view=plans` renders the existing comparison and temporary switching screen, including its dedicated throttle and inline feedback. Actual subscription term/status and prepaid next term are read from the database. No automatic renewal or live payment checkout is fabricated. Existing demo/non-billed access stays enabled only under the original configuration.
- PMP provider-token allocation, consumption, pending reservations, balance and reset use the existing PMP quota read model. Other AI operations use the existing credit ledger; the dashboard displays usable unexpired grants separately from provider tokens. Feature consumption is actual completed gateway requests in the current Bangladesh calendar month, independently of the PMP subscription cycle. Interview preparation is the existing non-AI practice flow. Feature plan access is distinct from operational availability, configured model/credit policy and provider connectivity. No new token accounting system is introduced.
- Help Centre has all six topics and eighteen guides sourced from the prototype. Steps that describe unavailable simulators or nonmatching membership access were adjusted to actual implementation. Search operates locally against static guide text. Contact support persists validated requests with optional JPG/PNG/WebP screenshots; only the owner or verified administrator can download screenshots. My support requests shows status and staff replies with pagination. Admin support requests list, filtering, detail and replies reuse AdminLayout. No mail/ticket notifications were added because they were not requested.
- Support requests use idempotency keys and a dedicated rate limit; admin reply submissions deduplicate. Screenshots are stored on the existing private local disk, not public media; account deletion removes the member's support directory. No production data was deleted by this update.
- Standard components: MemberDashboardLayout, AdminLayout, FormField, PMDropdown, LinkedPagination, shared button classes, centralized CSS tokens. Public layout and all other member menus remain unchanged.

## Deployment

Back up the database, merge the changed files, and run `php artisan migrate`, `npm run build`, `php artisan optimize:clear`, `php artisan queue:restart`. Existing queue workers must be active for AI review. Do not enable demo access on production just to test premium access. Use test accounts or real authorized subscriptions. Preserve .env and private storage.

## Verification

324 Node regression checks passed (319 existing and five added; one superseded static assertion updated to require the real server access projection). Modified PHP and TS/TSX syntax and CSS parsing passed. 18 isolated Chromium fixtures (Plan & usage, Help Centre, Contact support, at 320/390/768/1024/1440/1680 widths) passed no overflow, 16px body/card padding, standard button size and footer rail checks. These are not live React or Laravel pages. `npm run build` failed because `vp` is not installed; `php artisan test --filter=MemberWorkspace` could not run because `vendor/autoload.php` is missing. Added Laravel feature tests for plan/API authorization, real ledger arithmetic, idempotent ticket persistence and private screenshots/replies. Run these with installed dependencies and test database before release. No live AI request, database migration or deployment was performed here.

## Manual release checks

1. Free: PMP and Resume Assistant locks, modal action, direct URL/API forbidden, public preview accessible; Plus: PMP available and Resume AI locked; Pro: both routes available, configured resume review with owned file and explicit consent.
2. Verify real plan/status/term, expired/non-billed access, configured and unconfigured quota, reserved/remaining reconciliation, and per-feature totals against ledger. Ensure switching plans still works and rate-limit feedback remains inline.
3. Confirm profile overview values for a new and active member; desktop and mobile sidebar groups and footer on long/short pages.
4. Search all six Help Centre topics; open step-by-step articles and related guides. Submit one request with and without screenshot; verify validation, duplicate prevention, admin reply/status and member view. Another member must not see the request or screenshot.
5. Verify PDF/Word resume upload/import and existing AI gateway error states without changing AI keys or tariffs.

Known scope: no new Scrum/Project Simulator functionality or new recurring payment provider. Existing AI model/prompt/price configuration and credential availability remain prerequisites for actual AI execution. No universal AI token allowance exists outside the PMP quota in this source; credit and token quantities must not be added together. Full production release approval remains pending actual runtime tests.
