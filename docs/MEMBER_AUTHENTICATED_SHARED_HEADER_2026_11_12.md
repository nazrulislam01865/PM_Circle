# Authenticated header consistency — November 12, 2026

## Scope and root cause

`MemberDashboardLayout` previously rendered `MemberHomeHeader` only with `variant="member-home"`. The other variants rendered the public `SiteHeader` and `DashboardSidebar`. Public-facing content and the full-screen exam called `SiteHeader` directly, so even signed-in members could see a different navigation. An exam breadcrumb also linked signed-in members to `/` rather than `/dashboard`.

## Changes

- MemberDashboardLayout always renders `MemberHomeHeader`; the existing sidebar is no longer mounted in that layout.
- The approved member header is reused on public-content routes for active members who have completed onboarding, via SiteHeader. Admins and guests continue using their respective existing navigation.
- Site-layout routes reuse the user name and avatar already in the Inertia `auth` prop instead of loading the dashboard projection solely for header rendering.
- Header Home links to `/dashboard` throughout authenticated navigation. Community links from other pages use `/dashboard#community-feed`. Active highlighting follows the current Inertia URL rather than always highlighting Home.
- Member shell CSS is centralized in `resources/css/pm-member-shell.css`; the dashboard homepage-specific styling remains scoped to `.pm-member-home`. The 1480px container and existing theme tokens are preserved.
- Exam navigation breadcrumbs use authenticated Home and Learning destinations. No examination scoring, timing, or questions were changed.

## Files

1. `resources/js/layouts/pm/MemberDashboardLayout.tsx`: one shared member layout and no legacy sidebar.
2. `resources/js/components/dashboard/MemberHomeHeader.tsx`: reusable identity fallback, route-aware navigation and active state.
3. `resources/js/components/pm/SiteHeader.tsx`: delegate to the shared authenticated header for signed-in members without added database work.
4. `resources/css/pm-member-shell.css`: shared page geometry, header actions, responsive and focus styling.
5. `resources/css/app.css`: import shared shell stylesheet after existing page styles.
6. `resources/js/components/exam/ExamShared.tsx`: member-aware exam breadcrumb.
7. `resources/js/pages/exam/Result.tsx`: member-aware learning breadcrumb.

## Database and security

No migrations, database queries, controller changes, authorization changes or new endpoints. Public/guest routes remain public; admin layout remains distinct. Existing member-only middleware is unchanged.

## Verification available here

- The five updated TSX files pass TypeScript parser checks and all local alias imports resolve.
- Shared CSS parses without errors.
- The member layout now mounts only `MemberHomeHeader`, with no sidebar import.
- The direct-site header switches to member navigation using the already shared authenticated identity.
- A complete Vite build, Laravel feature test run and visual browser comparison have not run here; the uploaded source archive does not contain installed Composer/npm dependencies.

## Verify locally

```
composer install
npm ci
php artisan optimize:clear
php artisan test --filter=MemberDashboardTest
php artisan test --filter=MemberSectionRoutesTest
php artisan test --filter=PmpExamSimulatorTest
npm run build
```

Inspect `/dashboard`, `/exams/pmp`, exam results, `/dashboard/learning`, `/dashboard/daily-challenge`, settings, interview preparation, community and careers as an authenticated member. Compare header logo, selected tab, menus, actions, responsive mobile menu and hidden sidebar. Also check guest and admin views. Existing `public/build` files must be regenerated locally before testing the new UI.
