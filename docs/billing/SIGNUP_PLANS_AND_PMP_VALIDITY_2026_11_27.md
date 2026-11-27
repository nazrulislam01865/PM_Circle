# Signup plans and PMP membership validity

## Admin workflow

Open Admin > Signup plans & validity (`/admin/membership-validity`).

- **Choose Plan screen:** select Free, Plus or Pro using the shared PMDropdown. Edit the display name, benefits (one per line), optional badge, and signup visibility. Free cannot be hidden by this editor. Names and benefits are shared plan-catalog fields; badges and signup visibility are signup-specific. Plan codes and feature entitlements are immutable here.
- **Signup durations:** choose Plus or Pro, enter a duration in calendar months (1-60), total BDT price, and availability. Use Edit for an existing row. Changing the price creates a new price version and retires old active versions, preserving billing history. To replace a duration, save the new duration and disable the old row. The shared price catalog also serves comparison and member plan selection.
- **Existing member validity:** find a member by numeric ID. For existing non-billed Plus/Pro grants, choose a term and either retain the original activation date or explicitly start a new term now. Legacy undated grants require a confirmed start date. Paid subscription records are not modified.

Signup (`/join/step/3`, `auth/RegisterStep3`) loads the active plan catalog with an additional signup visibility filter and the same eager-loaded prices. There is no new signup read query or duplicate pricing table. Hidden plans and inactive durations are rejected by the server on submission. When complimentary access is disabled, signup offers Free only because paid signup checkout is not implemented. Public pricing and member plan selection retain their separate catalog view.

A successful eligible signup persists months, activation and expiry atomically under the user row lock. Retries of completed signup cannot extend the term. Expiry uses calendar months without overflowing the final day of a shorter month. Membership entitlement reads and directory display share the active-grant predicate. A verified paid term can still provide access independently of an expired grant. The PMP overview reuses plan details to show the actual dates, duration, used days and remaining days. No additional dashboard cards were introduced. Performance and Exam History use shared PMDropdown; the extra AI Usage status strip was removed.

## Policy and rollout

Existing legacy grants have no reliable signup duration; the migration deliberately leaves their dates null. Admin must assign their term rather than infer it. Existing valid paid subscriptions retain their verified terms. Signup complimentary access and post-signup demo switching are now separate controls. In production, leave `PMC_SELF_SERVICE_COMPLIMENTARY_SWITCHING_ENABLED=false` (default) to prevent users from restarting their validity by switching plans. If you intentionally require the old unrestricted demo switching behavior, explicitly set this flag to true along with `PMC_SELF_SERVICE_COMPLIMENTARY_ACCESS_ENABLED=true`. Local/testing demo switching continues to follow `PMC_TEMPORARY_PAID_ACCESS_ENABLED`. No payment is collected by complimentary signup. Existing complimentary entitlement feature flags are unchanged.

Two additive migrations:
- `2026_11_27_000003_add_validity_to_temporary_memberships.php`
- `2026_11_27_000004_add_signup_plan_controls.php`

Back up the database and stage the update first. This archive also contains the earlier engagement/certificate work from the supplied source; if those migrations have not been deployed, follow their existing migration/backfill instructions before turning on their read flags.

```sh
composer install --no-interaction --prefer-dist
php artisan optimize:clear
php artisan migrate --force
# Only if required to populate missing standard plan rows:
# php artisan db:seed --class=PlanSeeder
npm ci
npm run types:check
npm run build
php artisan test --filter=MembershipValidityTest
php artisan optimize
php artisan queue:restart
```

Freshly build frontend assets; generated assets and runtime caches are intentionally excluded from the full source archive. Do not delete existing production storage or overwrite the environment file. Use the existing deployment process and restart the application processes as necessary.

## Verification

Offline regression suite: `node --experimental-strip-types --test tests/Regression/*.test.mjs` (552 passed). New feature tests cover signup validity, replay, expiry, admin duration changes, hidden plans, permissions, legacy terms and paid fallback. Actual Laravel tests, PostgreSQL migration, full TypeScript type check/build and visual regression require installed project dependencies and staging. No production changes made.
