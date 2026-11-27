# PMP AI refill card and administrator-managed packages

## Scope and behavior

- AI Usage renders the original balance, activity ledger and refill card directly in the tab grid. The redundant outer surface, padding and border are removed. No change to other tabs, shared theme, exam scoring, plan validity or membership checkout.
- The refill card uses the prototype's radio rows, total and primary checkout action, with BDT only. Package title, credit amount, amount in integer minor units, optional expiry and visibility come from the existing `ai_credit_packages` catalog. No sample prices or fictitious purchase options are seeded. Both bKash and SSLCommerz appear; only approved, configured adapters can be selected. No Stripe, USD or Nagad option for AI refill.
- This project distinguishes PM Circle wallet credits from actual provider tokens and independently enforces PMP token quotas. Purchases still grant **credits**, not additional PMP token quota. The label and one explanatory note intentionally preserve that distinction. An active paid Plus/Pro subscription is still required by the existing checkout and delayed-settlement authorization rules. Complimentary users can see the catalog but cannot buy. Implementing purchasable token quotas or extending purchases to complimentary plans requires a separate product/accounting decision (including cycle rollover and refund semantics).
- The source contains only fail-closed gateway placeholders, not real merchant integrations. New provider selection, SSLCommerz binding slot and callback routing are wired to the existing payment contract; neither payment provider can charge using the supplied source alone. The supplied approved central payment plan (`docs/CENTRAL_PAYMENT_BACKEND_2026_11_19.md`) requires independently verified merchant adapters before charging. No unverified callback or redirect grants credits. Use official merchant adapters and sandbox checks before enabling sales. No credentials, fake logos, simulated payment success or new network services were added.

## Admin

`Admin > AI settings > AI refill packages` (`/admin/ai/refill-packages`). All active, email-verified administrators can manage refill packages automatically through the existing administrator role. No separate permission grant, seeder or migration is needed. Direct credit grants, reconciliation and other scoped privileges remain unchanged. Admins can add a named pack, edit credits, price in BDT, expiry and visibility, or remove it. An edit creates a new immutable price version and retires prior active versions within one transaction. Removing a package marks it inactive instead of deleting financial history. Existing paid orders and credit grants remain unchanged. A PostgreSQL transaction-level advisory lock serializes versions by package code, and the edit checks its expected version. All mutations are audited with an explicit reason. The admin page shows gateway readiness, but gateway credentials and activation remain controlled through deployment configuration, not this catalog editor.

## Technical changes

- Existing `GET /billing/ai-packages` returns active BDT packages in one catalog query, even when checkout is disabled, plus available providers. Loaded only when AI Usage is mounted. The member does not send any prices, credits or currency to checkout.
- Existing `POST /billing/ai-checkout` accepts optional `provider` (`bkash` or `sslcommerz`), and continues to enforce the server's enabled allowlist, paid subscription, package availability, integer price and currency. Explicit provider selection is part of idempotency validation. The package row is locked before snapshot creation so an edit/removal cannot race that read. No change to settlement or existing membership gateway selection. Previously used providers remain eligible for verified reversals.
- Existing `POST /admin/ai/packages` and `/admin/ai/packages/{id}/disable` remain the mutation endpoints, with `replace_id` for optimistic edit checks. The admin UI uses a partial Inertia reload after a successful write, not a full page or separate per-row requests.
- No database migration, new table, new dependencies, extra Redis cache or scheduled task for this feature. Existing payment and AI core migrations are prerequisites.

## Deployment

Build the source on staging. The archive omits stale build and runtime cache/session/debug artifacts. Use the existing PHP 8.4 / Node 22+ deployment workflow:

```bash
composer install --no-interaction --prefer-dist --optimize-autoloader
php artisan optimize:clear
npm ci
npm run types:check
npm run build
php artisan optimize
php artisan route:list --path=admin/ai/refill-packages
php artisan route:list --path=billing/ai
```

Run `php artisan migrate --force` only if previous project migrations are pending, following backup and staging validation. Do not replace a production .env or storage volume from a source archive.

Server controls (remain disabled until real merchant adapter integration and independent verification):

```dotenv
PM_PAYMENTS_ENABLED=false
PM_AI_PURCHASES_ENABLED=false
PM_AI_REFILL_PROVIDERS=bkash,sslcommerz
```

If `PM_AI_REFILL_PROVIDERS` is empty, AI refill uses the existing configured default merchant only when it is one of the two allowed providers. `PM_PAYMENT_PROVIDER` remains the default for membership checkout. Approved exact redirect hosts must also be set. Merely setting these flags cannot turn a placeholder into a real gateway. Register reviewed implementations of `PaymentGateway` under `payments.gateway.bkash` and `payments.gateway.sslcommerz` and verify all settlement/reversal cases before enablement. Callback routes still require provider-side independent verification.

## Verification

- 555 Node static regression checks passed (including 12 targeted checks).
- Changed PHP and TypeScript/TSX syntax checks passed. Full PHP/DB tests, TypeScript typecheck, Vite build and visual browser testing were not executed: Composer/vendor, PDO database drivers and frontend project dependencies are not installed here.
- New PHPUnit feature tests are supplied for admin authorization, versioned edit/removal, BDT validation, gateway filtering, method-aware idempotency and verified settlement via test adapters. Run `php artisan test --filter='AiRefillPackagesTest|CentralPaymentTest'` against a dedicated test database, never production. Then validate actual merchant sandbox checkout, callbacks, duplicate/refund events and checkout URLs.
