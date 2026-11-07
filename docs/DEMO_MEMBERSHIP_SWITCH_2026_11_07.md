# PM Circle — Free / Plus / Pro Demo Switching

## Current implementation

The authenticated `Compare plans` screen uses the existing `POST /membership/temporary` endpoint. `SetTemporaryMembership` validates the requested tier, checks that paid-tier catalog entries are active, and upserts a **non-billed** grant into `temporary_memberships`. It does **not** create a `subscriptions` record or collect payment. `CurrentMemberPlan` supplies the effective tier to the dashboard, learning entitlements, and other member features. Selecting Free removes the demo upgrade by setting the grant to `free`.

The source code in this ZIP already supported this behavior. The reason the buttons are disabled on the **production** server is that this explicit opt-in is disabled by default. The user-interface button labels have been clarified to say `Switch to Plus` and `Switch to Pro` instead of implying checkout. The message and fine print now explain the demo-only status.

## Enable on the live demo server

Use an administrator account on the server. Edit the **existing** `/var/www/pm-circle/.env` to set **one** unique occurrence of:

```dotenv
PMC_SELF_SERVICE_COMPLIMENTARY_ACCESS_ENABLED=true
PMC_PAYMENTS_ENABLED=false
```

Do **not** regenerate `APP_KEY`, change PostgreSQL credentials, or replace the production `.env`. The flag is **intentionally unrestricted to eligible signed-in members** while enabled; it is not suited to paid commercial access.

After editing, rebuild Laravel's configuration cache **as www-data**, not root (this server previously encountered HTTP 500 errors because root-owned cache files were unreadable):

```bash
cd /var/www/pm-circle
umask 022
chown -R www-data:www-data bootstrap/cache
sudo -u www-data php8.4 artisan config:clear
sudo -u www-data sh -c 'umask 027; php8.4 artisan optimize'
systemctl reload php8.4-fpm
```

Safely verify the effective flag without revealing secrets:

```bash
sudo -u www-data php8.4 artisan tinker --execute='dump([
    "demo_switching" => config("pm-circle.self_service_complimentary_access_enabled"),
    "payments_enabled" => config("pm-circle.payments_enabled"),
    "effective_switch_enabled" => \App\Domain\Billing\Actions\SetTemporaryMembership::enabled(),
]);'
```

Expected: `demo_switching=true`, `payments_enabled=false`, `effective_switch_enabled=true`.

If Free, Plus, or Pro are missing from the comparison, inspect the `plans` and `plan_prices` data; do not wipe the database. `PlanSeeder` inserts missing defaults while preserving existing admin-configured values and inactive plan settings. Run it only after reviewing those existing records.

## Roll back the demo switch

Change the flag to `false`, then rebuild the cache as `www-data` again. Existing `temporary_memberships` rows remain in the database for auditability, but `CurrentMemberPlan` stops using them when the feature is disabled. No paid subscriptions are created by this switch.

## Deployment and testing

Run locally:

```bash
php artisan test --filter=TemporaryMembershipTest
npm run types:check
npm run build
```

Commit the updated TSX, test, and this document. Pull the corresponding Git revision on the server. Upload the matching locally compiled `public/build/` via rsync. No migration and no new PHP packages are needed for this change.

## Safety

Keep authentication, email verification, authorization, throttling, CSRF, and upload/privacy protections intact. Do not represent these grants as payment receipts, renewals, or actual paid subscriptions. Disable complimentary self-service access when production billing goes live.
