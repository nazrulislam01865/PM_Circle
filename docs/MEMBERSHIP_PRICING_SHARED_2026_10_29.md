# PM Circle membership pricing: authenticated page fix (2026-10-29)

## Root cause

Public pricing (`GET /pricing`) uses `resources/js/pages/public/Pricing.tsx`.
The dashboard's **Manage plan** link directs members to `GET /membership`, which is handled by `resources/js/pages/billing/Membership.tsx`.
The earlier prototype update only modified the public screen, so members still saw the old `PlanCard` selection UI.

## Implementation

- Moved the complete pricing prototype's content (hero, Free/Plus/Pro comparison table, feature rows, plus billing-duration display, CTA row, fineprint, profile-import panel and informational dialog) to a shared `PricingComparisonContent` component.
- Public `/pricing` now consumes that component; existing registration/onboarding links remain unchanged.
- Authenticated `/membership` now consumes **the same component** inside the existing `MemberDashboardLayout`, so sidebar/header behavior and design tokens remain intact.
- A small authenticated-only notice shows the currently active plan and explains local testing versus unavailable checkout.
- The current plan cannot be activated again; any locally supported plan switch calls the existing `POST /membership/temporary` endpoint, with loading/errors/disable guards. No checkout, charges, subscription changes, or billing-duration persistence are fabricated.
- Kept the prototype's public pricing text, spacing and CSS unchanged except for shared-component extraction. Additional CSS is restricted to authenticated membership and CTA buttons.

## Changed paths

- `resources/js/components/billing/PricingComparisonContent.tsx` — new shared pricing content.
- `resources/js/pages/public/Pricing.tsx` — render shared pricing content, preserve public CTA routing.
- `resources/js/pages/billing/Membership.tsx` — render shared pricing design and preserve authorized temporary membership actions.
- `resources/css/pm-comparison.css` — scoped authenticated notices and button styles.
- `tests/Feature/Billing/TemporaryMembershipTest.php` — authenticated screen receives current plan and dynamic catalog.
- `docs/MEMBERSHIP_PRICING_SHARED_2026_10_29.md` — root cause, scope and verification.

## Security / database

No migrations or database writes are needed for the redesign itself. Actual temporary membership changes still require an authenticated, verified, onboarded member and the server-side development/testing environment gate. No production checkout flow is added.

## Verification

TypeScript TSX syntax and CSS syntax were parsed without error; PHP test file passed `php -l`. The supplied archive does not have `node_modules` or `vendor`, so full production `npm run build` and Laravel PHPUnit execution were not available in this environment. Compiled `/public/build` assets in the full archive are **old**, and must be replaced with a fresh local build before deploying.

On the development machine run:

```bash
npm install
npm run types:check
npm run build
php artisan test --filter=PricingPageTest
php artisan test --filter=TemporaryMembershipTest
```

On the server, use the usual source deployment and `rsync` your freshly built `public/build/`. Then clear Laravel caches with `php artisan optimize:clear` (only after environment/DB/config have been checked). A hard refresh may be necessary if the browser retains old assets. Verify both `/pricing` and `/membership` in a logged-in session.
