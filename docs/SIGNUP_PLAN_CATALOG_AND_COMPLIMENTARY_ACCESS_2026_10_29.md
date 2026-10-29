# PM Circle — Registration Step 3 plan catalog and no-payment access fix

## Verified root cause

`OnboardingController::catalog()` reads active `plans` and active `plan_prices` from the current PostgreSQL database. If there are no active plan records, the React `plans.map()` produces no cards. The previous component displayed a misleading `Selected: Free` fallback even with zero plans. CSS and membership selection were not the cause.

## Source changes

- `database/seeders/PlanSeeder.php`: `firstOrCreate` repairs missing Free/Plus/Pro plans and plan durations without changing existing administrators' prices, benefits, or active flags.
- `app/Http/Controllers/Onboarding/OnboardingController.php`: deterministic plan order; the existing server-side checks for valid plan/duration remain. Checkout is not required when explicitly permitted no-payment access is enabled.
- `resources/js/pages/auth/RegisterStep3.tsx`: retains the original reusable `PlanCard`, centralized blue theme, Free/Plus/Pro selection, and 1/3/6/12-month options from the database. Shows a clear error for an empty catalog instead of a fake Free selection, and does not claim to charge anyone.
- `app/Domain/Billing/Actions/SetTemporaryMembership.php`, `app/Domain/Billing/Queries/CurrentMemberPlan.php`, and `config/pm-circle.php`: add `PMC_SELF_SERVICE_COMPLIMENTARY_ACCESS_ENABLED`, an *explicit* opt-in for granting non-billed Plus/Pro access outside local/testing. No payment or `subscriptions` row is fabricated.
- `resources/js/pages/billing/Membership.tsx`, `app/Http/Controllers/Billing/TemporaryMembershipController.php`: correct the notice/status wording for complimentary access.
- Tests: cover empty catalogs, non-destructive catalog seeding, and explicit production opt-in without payment.

## Required steps on an EXISTING installation (local)

From the project directory:

```bash
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views storage/framework/testing
php artisan config:clear
php artisan migrate --force
php artisan db:seed --class=PlanSeeder
php artisan route:clear
php artisan test --filter=PMCircleOnboardingTest
php artisan test --filter=TemporaryMembershipTest
php artisan test --filter=PricingPageTest
npm run types:check
npm run build
```

The seeder command is **required** on existing databases with missing plans: simply replacing TSX/PHP files does not populate database records. It only inserts missing default rows and never overwrites custom prices or existing inactive flags. If a plan was deliberately disabled, enable it separately through the authorized administration workflow.

For local/testing grant access, set in `.env`:

```dotenv
PMC_TEMPORARY_PAID_ACCESS_ENABLED=true
PMC_SELF_SERVICE_COMPLIMENTARY_ACCESS_ENABLED=false
```

For production, complimentary self-service membership is **off by default**. To intentionally allow everyone to choose Plus/Pro without checkout, explicitly set:

```dotenv
PMC_SELF_SERVICE_COMPLIMENTARY_ACCESS_ENABLED=true
```

Then run `php artisan config:clear` (or rebuild the configuration cache using the standard deployment process). This is a business policy switch: any authenticated onboarding member can choose Plus/Pro without payment while it is enabled. It does not charge money, create subscription records, process payment verification, or set a paid renewal date. It writes a user-specific non-billed grant to `temporary_memberships`. The selected duration is comparison information; it does not set an expiry date. Turning off both access switches stops recognizing grants, while actual paid subscription records remain independent.

**Security:** Existing authentication, CSRF, throttling, available-plan/duration validation, and membership-level authorization remain in place. Do not disable those controls to skip payment processing.

**Database:** No new migration. Existing `plans`, `plan_prices` and `temporary_memberships` tables are reused. Run the existing migrations first if not present.

**Build:** PHP lint and offline React TSX transpilation were checked here. Full PHPUnit and `npm` build cannot be executed on the uploaded archive because `vendor/` and `node_modules/` are absent. Do not assume deployment succeeded until checked on the target environment.
