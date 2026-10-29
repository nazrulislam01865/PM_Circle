# Signup theme and membership-duration options correction (2026-10-29)

## Cause

The previous signup patch introduced a green-only palette in `resources/css/pm-circle.css`, overriding the PM Circle shared blue theme. This was unauthorized: the reference screenshot showed green, but the actual project uses the centralized blue `--pm-primary` token. The account-creation screen also rendered a duration selector only when the selected plan had *more than one* active price; a paid plan with one active record therefore showed no selector. A plan with no active prices was likewise silent.

## Changes (limited scope)

- Removed the signup-only green color overrides. The existing blue `--pm-primary` theme, brand mark, selected cards, focus states and progress bars now apply consistently on every signup step.
- Kept the existing `PlanCard`, `ActionButton` and `OnboardingLayout` components, membership endpoint, and general layout.
- On step 3, use a configured Plus plan as the initial selection (or first plan if Plus is unavailable). Select a valid configured duration by default.
- Show a duration selector whenever a selected paid plan has a configured price, even if it has only one duration; show an explicit configuration message if it has none. Never invent missing durations or prices in the browser.
- Preserve the pre-existing Free sign-up flow and local/testing-only temporary Plus/Pro behavior. No email verification, checkout, entitlement, pricing-model or database schema changes.
- Added a server-side feature test that the plan catalog sent to Step 3 contains the four seeded Plus durations: 1, 3, 6 and 12 months.

## Why options might still be missing in an existing database

Duration choices come from *active* `plan_prices` records. `PlanSeeder` defines four prices for Plus, one for Pro, and one zero-price record for Free. If some Plus rows were not seeded or were deactivated, only active records are shown. Do **not** invent missing prices in the React client. Inspect your database before reseeding: `db:seed --class=PlanSeeder` will update version-1 prices to default amounts and should not be run blindly on a configured production catalog.

## Verification and deployment

- PHP syntax verified for updated feature test.
- TypeScript TSX transpile diagnostics: no syntax errors.
- Original global blue tokens remain unchanged; green scoped overrides removed from CSS.
- Full PHPUnit run and Vite build were not executed in this environment because the upload did not include `vendor` or `node_modules`.

In your local project:

```sh
php artisan config:clear
php artisan test --filter=PMCircleOnboardingTest
php artisan test --filter=TemporaryMembershipTest
php artisan test --filter=PricingPageTest
npm install
npm run types:check
npm run build
```

For deployment, upload the newly compiled `public/build` output (or compile on the target server) and clear server-side caches as appropriate. The code changes require **no database migration**.
