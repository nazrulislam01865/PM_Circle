# Pricing prototype implementation — 2026-10-29

## Requirement and scope

Align the public `/pricing` screen with the supplied comparison-table screenshot, without redesigning the wider app. Retain PM Circle's Laravel/Inertia architecture and its database-driven plan catalog.

## Implementation

- Retained `PlanComparisonRows` as the single reusable source for the groups, labels, icons and plan values. Fixed row labels by keeping `<th>` as a table cell, with an inner flex container, so the four comparison columns cannot be disrupted by table-cell display overrides.
- Updated `Pricing.tsx` to use the current `Plan` catalog for free, Plus and Pro price display, billing period options, and annual/multimonth totals. The Plus dropdown changes the displayed effective per-month amount without modifying any subscription or payment record.
- Scoped the pricing header, footer, table, banner, responsive styles, and monogram to `pricingPrototype` / `pm-pricing-shell`. Other pages using `PublicLayout` and `Brand` keep their previous look. Logged-in members retain their existing shared member dashboard shell.
- Replaced the placeholder upload illustration with a reusable lightweight SVG component; it is decorative, not a file upload UI.
- Implemented the explanatory profile-import button as a shadcn/Radix dialog, explaining clearly that profile import is not yet available. Did not fabricate an uploader or a payment gateway.
- The pricing plan calls-to-action use the existing registration, onboarding-plan and membership-management routes, depending on authentication/onboarding status. Paid checkout remains unavailable until integrated and approved.

## Files

- `resources/js/pages/public/Pricing.tsx` — pricing screen, real plan prices, billing selector, actions, banner dialog.
- `resources/js/components/billing/PlanComparison.tsx` — semantic feature-column row layout and included/limited states.
- `resources/js/components/billing/ProfileImportIllustration.tsx` — reused SVG illustration component.
- `resources/js/layouts/pm/PublicLayout.tsx` — optional isolated pricing-prototype presentation of existing shell.
- `resources/js/components/pm/Brand.tsx` — optional PM-letter monogram without changing default appearance.
- `resources/css/pm-comparison.css` — scoped layout and responsive pricing design, based on central PM Circle tokens.
- `tests/Feature/Billing/PricingPageTest.php` — HTTP/Inertia catalog and price-dynamic regression checks.

## Database and security

No migration or schema change. Plan values continue to be loaded from the existing active `plans` and `plan_prices` records. No new payment or membership authority is granted on the frontend.

## Verification

- TSX files: parsed/transpiled with TypeScript (syntax only).
- CSS: parsed with PostCSS (syntax only).
- PHP test file: `php -l` passed.
- Static HTML/CSS browser layout preview: checked around 863px reference width and 390px mobile width; a 390px viewport had no document-level horizontal overflow; the comparison table independently scrolls.
- The supplied ZIP does not include `node_modules` or `vendor`, and the execution environment cannot resolve the npm registry. Therefore actual npm production build, full TypeScript type resolution and PHPUnit/Laravel integration tests could not be completed here. Existing `public/build` files from the source ZIP have NOT been rebuilt.

## Deployment/acceptance

On the local development machine with dependencies/network access, run:

```bash
composer install
npm install
npm run types:check
npm run build
php artisan test --filter=PricingPageTest
```

Re-upload the **new** `public/build/` output during deployment (for example using the existing frontend `rsync` approach); do not deploy the old `public/build/` directory from this archive as if it contained the redesigned screen. No migration is needed for this isolated change.

The screenshot is a feature comparison/proposal. Some displayed capabilities (checkout and profile import in particular) are not available yet and must not be treated as deployed functionality.
