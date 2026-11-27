# Compare Plans and Refund Policy content management

Scope: `/pricing` and `/refund-policy`, their section-wise admin controls and focused tests. Existing About Us/Trends editing, billing, memberships, checkout, refund processing, and other pages are not changed. The membership workspace keeps its existing default comparison content and actions.

## Admin

- `/admin/public-pages/compare-plans`: banner, comparison headers and duration labels, Community & profile, Learn & practice, Career & insights, action labels, notes, profile import and its dialog. Each feature row supports a label, an allowlisted icon, and the displayed Free/Plus/Pro values. Use `Included` or `Not included` for the existing tick/dash indicators; any other nonempty text is displayed literally. Add, remove or reorder rows within a group. Group visibility, notes and the profile-import section can be controlled independently.
- `/admin/public-pages/refund-policy`: banner, contents navigation, monthly plan payments, cancellation, payment/access issues, consumer rights. Each policy section retains its public anchor. Add, edit, reorder or remove paragraphs (at least one per policy section). A paragraph may have one optional link: enter the exact linked phrase from the paragraph and its destination; the phrase must occur exactly once. Only safe internal paths or HTTPS URLs are accepted. Content renders as escaped React text, not arbitrary HTML.
- Save each section independently. The editor uses existing admin authorization, CSRF, throttling, revision checks, a database transaction and page-specific cache invalidation. Changes are public after save; review legal text and marketing claims before publishing. There is no new draft workflow.

## Storage and pricing

Existing `home_page_contents` keys `public_compare-plans` and `public_refund-policy`. Defaults are stored in the two JSON files in `resources/js/data`, and appear until the admin saves overrides. No migration or seeding required; the existing schema must already be migrated. Public page content uses the existing 300-second cache; no additional browser API request. Real amounts, durations and active plan data continue to come from `OnboardingController::catalog()`; editing presentation does not change entitlements, quotas, prices, refunds or billing. The default table is informational and should be checked against actual enabled features before publishing changes.

## Apply / verification

Preserve `.env`, APP_KEY, database and existing persistent storage. The full source archive deliberately omits stale Vite build output and runtime caches/debug data. On staging:

```sh
composer install
npm ci
php artisan optimize:clear
php artisan test --filter=PlansAndRefundContentTest
npm run types:check
npm run build
node --experimental-strip-types --test tests/Regression/*.test.mjs
```

Run browser checks for public/member layouts on desktop and mobile: default text, independent section saves, cache invalidation, refund navigation anchors, Plus duration dropdown, profile-import dialog, and existing register/membership links. No schema migration is added by this update. Existing application migrations are not modified.

Verification in the editing environment: 17 focused source regression checks passed; full Node regression suite 545/546 passed. The same PMP dashboard assertion fails on the original archive. Six PHP files passed syntax checks; six TSX files passed TypeScript transpilation syntax checks. Laravel feature tests, full TypeScript type checking, browser visual verification and Vite build are not verified because the archive does not contain installed dependencies. Do not treat source checks as production acceptance.
