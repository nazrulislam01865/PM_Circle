# PM Circle signup: restore prototype presentation without checkout or email gates

## Root cause and scope

The previous public pricing and dashboard membership redesigns did not edit `RegisterStep1.tsx`, `RegisterStep3.tsx`, `OnboardingLayout.tsx`, or `OnboardingController.php` (these matched the baseline archives). The approved onboarding screenshot is green, whereas the shared site palette in `pm-circle.css` was blue. The registration copy also suggested payment billing even though no payment gateway is implemented.

## Implemented (signup only)

- `resources/css/pm-circle.css`: scope the green reference palette, green brand mark, selected plan and duration colors, and mobile-safe summary wrapping under `.pm-auth-shell`. No global pricing/dashboard theme changes.
- `resources/js/pages/auth/RegisterStep1.tsx`: simplify the explanatory note so it doesn't introduce an unnecessary email verification concept.
- `resources/js/pages/auth/RegisterStep2.tsx` and `resources/js/layouts/pm/OnboardingLayout.tsx`: remove the decorative 'email verified / verification not required' badge, which is not a verification step. Keep original layout, fields, and form behavior.
- `resources/js/pages/auth/RegisterStep3.tsx`: preserve original plan cards, prices, duration selector and flow. Replace misleading 'Due today' and renewal statements with accurate status. In local/testing temporary-access mode, no payment is collected. When paid checkout is unavailable, prevent submission of a paid plan using the button and offer the existing Free option instead.

No new payment process, email verification request, subscriptions, or database changes were added. Backend membership and onboarding actions and email verification settings remain unchanged.

## Existing backend behavior (verified by source inspection)

- `PMC_EMAIL_VERIFICATION_REQUIRED=false` is the existing default; the `verified` route middleware respects the `User::hasVerifiedEmail()` configuration. If a developer's `.env` explicitly sets it to `true`, it must be set to `false` to make signup email verification optional. Do **not** fake `email_verified_at` or remove CSRF protection.
- `PMC_PAYMENTS_ENABLED=false` is the existing default. No payment gateway or checkout is configured.
- `PMC_TEMPORARY_PAID_ACCESS_ENABLED=true` works **only** in Laravel local/testing environments. Production must not grant paid entitlements without a verified payment. In production, Free signup still works; paid plans remain visible for comparison but cannot be activated via this form.

## Local verification commands

```bash
php artisan config:clear
npm install
npm run types:check
npm run build
php artisan test --filter=PMCircleOnboardingTest
php artisan test --filter=TemporaryMembershipTest
php artisan test --filter=PricingPageTest
```

Review `/register`, `/join/step/2`, `/join/step/3`, `/pricing` and `/membership` visually in both desktop and mobile viewports. Production assets must be rebuilt and uploaded; previously compiled `public/build` assets are intentionally excluded from the full corrected ZIP.

## Verification here

TSX syntax checked with TypeScript transpilation for all four touched React files. Laravel controller and configuration PHP syntax checked. Unrelated pricing/billing React files and backend onboarding files confirmed byte-identical to original archive. Full Laravel tests, typecheck and production build were **not** run (uploaded project lacks `vendor` and `node_modules`).
