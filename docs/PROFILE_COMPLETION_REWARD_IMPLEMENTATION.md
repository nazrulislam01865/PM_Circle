# PM Circle — Profile Completion Reward

## Deployment and scope

This change adds the reward to the logged-in homepage's right column, to the profile overview's right column, and to the public homepage's existing simulator-carousel promotional strip. The public homepage header also shows the matching offer badge. Existing card placement, page structure, fonts, and central UI tokens are reused. Admin settings are at `/admin/profile-rewards` behind the existing `auth`, `pm.admin`, and `verified` middleware.

Initial settings (until changed by an administrator): enabled, 10% discount, 5-day validity, BDT currency for fixed discounts. The administrator can instead select a fixed BDT or USD amount and set 1–365 days. Previously issued rewards keep their issued terms even when campaign settings change. Disabling the campaign prevents new issuance but does not revoke codes already issued. Fixed discounts require matching currency; percentages work in either currency.

## Completion and issuance

Exactly the ten existing profile-suite requirements determine **reward and badge eligibility**: member name, headline, role, industry, country, city, about, avatar, at least one skill, and at least one experience. These rules are unchanged. The dashboard and profile page both use `App\Domain\Identity\Services\ProfileCompleteness`.

The displayed member profile progress now measures 20 equally weighted criteria from the active detailed editor and profile photo: name, headline, current role, location, email, phone, LinkedIn, portfolio, GitHub, personal summary, avatar, skills, experience, education, projects, research, achievements, interests, languages, and certifications. Each satisfied criterion contributes five percentage points. Clearing a field or removing the last entry of a section after saving reduces this score; optional subfields and individual entries in still-populated sections do not independently contribute. Private resume content is not counted. The original ten-field reward score is evaluated separately so existing reward and badge contracts remain unchanged.

On opening the member dashboard or profile, the server checks completion. Before 100% of the required reward fields, the member sees the exact call-to-action (no usable code is sent). At 100% of the required reward fields, the server creates at most one user-bound code; the `user_id` and code unique constraints, plus `createOrFirst`, protect concurrent requests. Issuance starts the validity clock and persists the reward amount/type/currency/expiry. Codes are not reissued on subsequent visits, even if expired or used.

**Note on profile completeness:** The profile's existing hint says “Add a work sample”; work samples are not presently one of its ten tracked criteria. This copy was preserved because the supplied prototype requires it. The reward eligibility is based solely on the authoritative criteria listed above.

## Checkout integration boundary

**The uploaded archive does not contain live paid checkout.** No fake payment, invoice, or unverified redemption route was added. The module does not charge or change memberships.

A future verified checkout controller must:

1. Resolve the authenticated user, persisted simulator plan/price, and payment currency **server-side**. Never trust client-provided totals or rewards.
2. Call `ProfileCompletionRewardService::discountMinor($user, $code, $subtotalMinor, $currency, 'simulator')` and subtract only the returned integer minor units. This method rejects other members' codes, incomplete profiles, expired/used codes, and non-simulator products.
3. Present the reduced total to the payment gateway and verify the authoritative callback signature, order amount, currency, and payment status using the existing payment service when implemented.
4. During final payment transaction, call `markRedeemedAfterVerifiedPayment($user, $code, $verifiedPaymentReference, $subtotalMinor, $currency, 'simulator')`. This method uses row locking and is idempotent for repeated callbacks with the same reference. Do not call on unsuccessful, pending, unverified, or canceled payments.
5. For fully safe concurrent checkout, put both order finalization and reward redemption in the **same** DB transaction, hold the reward row lock while computing the charge/claim, and uniquely constrain the gateway transaction ID. Reserve the code or prevent concurrent pending checkouts from applying it twice before settlement.

In other words, issuance and validation are implemented here. Live discount application awaits the real payment checkout and must not be advertised as an existing, working integration.

## Database changes

Run the additive migration `2026_11_16_000001_create_profile_completion_rewards.php` before deploying the code. It adds `profile_reward_settings` and `profile_completion_rewards`. The second table is unique on `user_id`, `code`, and `redemption_reference`. Existing membership, plan, and payment records are unchanged. No destructive operation is necessary.

## Local verification and deployment

```bash
# Ensure PHP 8.4, PHP extensions, Composer dependencies, Node >= 22.18, and project env are configured.
php artisan migrate --force
php tests/Regression/ProfileRewardStaticCheck.php
php artisan test --filter=ProfileCompletionRewardTest
npm ci
npm run types:check
npm run build
php artisan optimize:clear
php artisan config:cache
php artisan view:cache
# Optionally run php artisan route:cache only if existing routes support caching.
```

Run migrations and tests in a staging environment before production. Inspect the admin settings, an incomplete and a fully complete member profile, header badge, profile sidebar, dashboard sidebar, and mobile overflow visually. Confirm billing is still demo-only until authorized live checkout is integrated.

## Rollback

Deploy previous code and assets if rollback is needed. **Do not run `migrate:rollback` on production** without reviewing the reward tables and backing up issued codes. New reward data is customer-facing and should be preserved.

### Known validation limitations in this delivered archive

The supplied ZIP contains neither `vendor/` nor `node_modules/`, and the execution environment lacks a Composer executable and PDO database drivers. The offline npm install cannot fetch an uncached dependency, so PHPUnit/database integration and a production frontend build cannot be run here. PHP lint, TypeScript source parsing, CSS parsing, the reward source contract, and the existing source-regression checks have been run; these are not substitutes for staging feature tests or browser screenshot comparison.
