# PM Circle — unified member sidebar and temporary memberships

## Root cause

The Inertia layout resolver in `resources/js/app.tsx` returned the default Laravel `AppLayout` for `learning/*` pages. Those pages also rendered `MemberDashboardLayout` themselves, nesting two complete application shells (Laravel + PM Circle). Settings routes also used the starter Laravel application sidebar.

## Scope of changes

- `resources/js/app.tsx` — learning pages and other self-managed PM pages no longer receive an additional Laravel layout; settings uses one PM member shell.
- `resources/js/layouts/settings/layout.tsx` — retain settings subsections as page-level tabs while using PM member shell.
- `resources/js/layouts/pm/PublicLayout.tsx` — authenticated, fully onboarded members see the same PM member header/sidebar on community and public routes; visitors retain their approved public header and footer.
- `app/Http/Middleware/HandleInertiaRequests.php` and `app/Domain/Dashboard/Queries/MemberShell.php` — share one minimal per-member shell data contract with all Inertia pages.
- `resources/js/components/dashboard/DashboardSidebar.tsx` — preserve navigation selection across settings, posts and scenarios; direct plan management to `/membership`; keep advanced simulation restricted to Pro.
- `resources/js/layouts/pm/MemberDashboardLayout.tsx` — remember expanded/collapsed navigation setting across Inertia page changes in local browser storage.
- `app/Domain/Billing/Actions/SetTemporaryMembership.php` — local/testing-only, validated member-owned temporary feature grant.
- `database/migrations/2026_10_29_000004_create_temporary_memberships_table.php` — one demo membership per member. **Never a financial record.**
- `app/Domain/Billing/Queries/CurrentMemberPlan.php` — server-side plan access reads temporary grant **only** when local/testing and the feature flag are enabled. Production always checks real verified subscriptions.
- `app/Http/Controllers/Onboarding/OnboardingController.php` — Free/Plus/Pro selection supported during local onboarding without checkout, with price/duration validation retained.
- `app/Http/Controllers/Billing/TemporaryMembershipController.php`, `resources/js/pages/billing/Membership.tsx`, `routes/web.php`, `resources/css/pm-member-plans.css` — protected plan-switch flow for existing local members using centralized PlanCard, typography, colors and button styles.
- `.env.example` — safe local setup defaults with required demo toggle.
- `tests/Feature/Billing/TemporaryMembershipTest.php` — tests for access control, subscription isolation, switching, onboarding, invalid plans, and production prevention.
- `tests/Feature/PMCircleOnboardingTest.php` — preserve prior no-gateway test under disabled temporary mode.

## Usage

Local development (with `APP_ENV=local`):

```ini
PMC_TEMPORARY_PAID_ACCESS_ENABLED=true
PMC_EMAIL_VERIFICATION_REQUIRED=false
PMC_PAYMENTS_ENABLED=false
```

Run `php artisan migrate` (non-destructive: adds `temporary_memberships`). Existing accounts can open `/membership` after login and choose Plus or Pro, or switch back to Free. Newly registered accounts can choose Plus or Pro on Step 3. The application then redirects to `/dashboard` and the member sidebar and learning authorization read the active development grant. No provider is called, no payment intent/receipt is created, and no `subscriptions` row is faked.

**Production:** The temporary grant is always rejected when `APP_ENV=production`, even if a feature flag is mistakenly enabled. Real paid tiers still require verified checkout/webhooks. Development preview is temporary, not a paid billing implementation.

## QA

- Verify dashboard, `/learning`, learning roadmap and activity, `/community`, `/posts/{id}`, `/settings/profile`, `/settings/security`, `/membership`: exactly one PM sidebar and shared search header.
- Verify `/login` and `/register` preserve the approved unauthenticated page structure.
- Verify temporary Plus and Pro plans are available locally from both Step 3 and `/membership` and are isolated to the owning account.
- Verify Pro-only items remain restricted to Pro, and `pending_payment` never grants paid features in production.
- Verify collapse setting persists between pages, and small-screen drawer never overlaps main content.
- Full Laravel/React/browser tests still require installed Composer/Node dependencies and database runtime.

### Existing .env and deployment precautions

Keep the current `.env`, `APP_KEY`, and database credentials. Apply `php artisan migrate` to create the *new* independent demo table; do not run `migrate:fresh`. `php artisan db:seed --class=PlanSeeder` is idempotent if the local plan catalog has not been populated yet. Run `php artisan optimize:clear` and `npm run build` to refresh both route/config and browser assets. Never use `APP_ENV=local` in production merely to enable temporary access. Keep `PMC_PAYMENTS_ENABLED=false` until a verified payment gateway is implemented.
