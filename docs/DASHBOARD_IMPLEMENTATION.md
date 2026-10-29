# PM Circle Dashboard — Screenshot Alignment (29 October 2026)

## Scope and source

Built on the user's latest `Archive(1).zip`, guided by all three dashboard screenshots in `WhatsApp Unknown 2026-10-29 at 1.50.04 PM.zip`, and section 10 of the PM Circle SRS. Only dashboard-specific layouts and components were added; public, login, signup and onboarding layouts are unchanged.

The desktop dashboard matches the reference's 264px left navigation, 67px search header, central feed/composer/practice stack, 348px right-side profile/learning/insight column, cards, blue buttons, borders, typography and white/light-blue backgrounds. Responsive rules adapt at 1240/1050/830/650px. Tokens stay in `resources/css/pm-circle.css`; dashboard-only layout rules are in `resources/css/pm-dashboard.css`.

## Viewing all three supplied variants

Log in to a locally configured account with completed onboarding, then visit:

- `/dashboard?demo_plan=free` — Free reference with locked practice options and upgrade card.
- `/dashboard?demo_plan=premium` — Premium reference with ERP simulation and career/visibility demo.
- `/dashboard?demo_plan=pro` — Pro reference with scenario and profile insights.

Preview overrides work **only** when `APP_ENV=local` or `testing` **and** `PMC_DEMO_CONTENT_ENABLED=true`. They affect **rendered sample UI only**. They do not create paid subscriptions, alter Laravel policies or enable premium server actions. Normal `/dashboard` derives paid status only from an active, time-valid subscription record, never from query strings. Never treat local screenshot previews as subscription entitlement checks.

`php artisan db:seed` populates two additional fictional dashboard posts only locally (after the pre-existing demo community members); the dashboard prioritizes them only in explicit screenshot preview mode while preserving the normal dashboard and public home/community feed ordering. Images are cropped from the supplied dashboard reference, not stock substitutes.

## Working / not yet integrated

Working via existing Laravel routes: authenticated dashboard loading, community post creation/asking, public post Like/Love, saved posts, search to public discussions, pagination/related navigation, plan comparison, profile settings and logout. `Clap` renders as the screenshot label but uses the platform's pre-existing `love` reaction (SRS supports Like/Love). Search only includes published public posts. Forum feed is limited to two cards in dashboard for quick loading.

Placeholder-only by design: exams, simulators, achievements, follow feed, public profile, notifications, resume tools, AI feedback, recruiter privacy and career analytics. These links lead to a clearly identified coming-soon screen, rather than claiming a feature exists. The anonymous question button does not submit unimplemented privacy-sensitive actions. Resume visibility toggles are a disabled screenshot demonstration; no resume becomes public. AI credit/learning/profile-view statistics are illustrative **only** in local/testing. No new database migrations were introduced.

## File map

- `app/Http/Controllers/Dashboard/DashboardController.php` — authentication-aware page orchestration.
- `app/Domain/Dashboard/Queries/DashboardOverview.php` — compact, authorized read projection and valid subscription-state lookup.
- `resources/js/pages/account/Dashboard.tsx` — assembled dashboard page.
- `resources/js/layouts/pm/MemberDashboardLayout.tsx` — dashboard-only chrome and mobile navigation.
- `resources/js/components/dashboard/*` — shared navigation, header, composer, feed cards, scenario/simulation and sidebar panels.
- `resources/js/types/dashboard.ts` — typed Inertia page payload.
- `resources/css/pm-dashboard.css` and `pm-dashboard-{shell,panels,responsive}.css` — compact, scoped styles reusing established design tokens.
- `public/images/dashboard/*.webp` — compressed reference-extracted imagery.
- `database/seeders/DemoDashboardSeeder.php` — idempotent local/test data only.
- `routes/web.php` — dashboard controller and protected placeholder destinations.
- `app/Http/Controllers/Community/PostController.php` — optional public-only keyword search.
- `tests/Feature/Dashboard/MemberDashboardTest.php` — guards, visibility, pending billing and feed behavior.

## Running & verifying

Use PHP 8.4+, Composer, PostgreSQL and Redis as documented in README. In the extracted project:

```bash
composer install
npm install
php artisan migrate
php artisan db:seed
npm run types:check
npm run build
php artisan test --filter=Dashboard
php artisan serve
```

`APP_ENV=local`, `PMC_EMAIL_VERIFICATION_REQUIRED=false`, and `PMC_DEMO_CONTENT_ENABLED=true` are for local previews. In production, restore email verification and disable demo data. No AI, payment or public-resume features should be launched before their backends and security tests are complete.

### Verification note

In the packaging environment, the PHP `pdo_pgsql`/`pdo_sqlite` extensions, Composer and project npm/vendor dependencies were unavailable. PHP lint, TypeScript parser/local import checks and ZIP integrity were executed. **Laravel feature tests, production builds, and browser pixel-diff screenshots are not claimed as passed**; execute them in your configured development environment before approving visual fidelity.
