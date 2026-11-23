# PM Circle - member header, sidebar and offer bar restore (2026-11-23)

## Verified cause

- `MemberDashboardLayout` rendered `MemberHomeHeader` plus `MemberSecondaryNavigation`, but did not mount the existing `DashboardSidebar` component; dashboard pages therefore could not display the requested grouped sidebar.
- `PublicLayout` only showed the server-configured homepage promotion if individual pages passed `homeOfferLabel`. Other routes had the shared `rewardPromotion` prop but ignored it.
- `HandleInertiaRequests` deliberately excluded authenticated public URLs from `memberShell`. They therefore could not reuse the member layout.

## Implementation

- Every completed, non-admin member accessing the regular site through `PublicLayout` uses the same authenticated member shell; guest pages retain the original public homepage navigation.
- Authenticated top header contains only a textual "My profile" link and three member controls (search, notification and avatar/account), with an additional navigation opener at mobile widths. The primary, secondary and submenus are in a single fixed, collapsible grouped sidebar. The timed PMP attempt remains a focused exam workspace but can open that same sidebar as a drawer.
- Sidebar destinations use existing Laravel routes. Existing authorization, plan checks and exam scoring are unchanged.
- The cached `rewardPromotion` shared prop now drives the exact existing `HomeOfferBar` and `RewardOfferProvider` on all public, authentication, member and timed exam pages (unless disabled in configuration). No duplicated queries or hard-coded discount amounts.
- Reuses the existing `SiteFooter` and approved `HomeFooter` implementation verbatim.
- Responsive CSS is isolated under member layout classes to avoid modifying guest or admin presentation. Uses centralized UI tokens.

## Files changed

- `app/Http/Middleware/HandleInertiaRequests.php`: permit the existing lazy member shell projection for every completed, non-admin member.
- `resources/js/layouts/pm/PublicLayout.tsx`: reuse the member shell on authenticated public URLs and make promotion rendering centrally controlled.
- `resources/js/layouts/pm/MemberDashboardLayout.tsx`: restore sidebar, compact header, promotional bar, and correct member grid/footer rows.
- `resources/js/layouts/pm/AuthPageFrame.tsx`: show the same offer bar on login/signup.
- `resources/js/components/pm/SiteHeader.tsx`: use the same compact member header and drawer during active examinations.
- `resources/js/components/dashboard/MemberCompactHeader.tsx`: new reusable authenticated header.
- `resources/js/components/dashboard/DashboardSidebar.tsx`: grouped profile, learning, community and account links with submenus.
- `resources/css/pm-member-sidebar-restore.css`: new responsive isolated authenticated shell styles.
- `resources/css/app.css`: imports member styles last.
- Static regression tests updated for newly approved navigation and offer behavior; new `memberSidebarAndOfferRestore.test.mjs` added. Existing missing-guide fixture reference corrected to its actual supplied `pmDoc` location.

## Verification

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 234 passed, 0 failed.
- `php -l app/Http/Middleware/HandleInertiaRequests.php`: passed.
- `php tests/Regression/ContactPageAndFooterStaticCheck.php`: passed.
- `php tests/Regression/SharedFooterCoverageCheck.php`: passed.
- TypeScript transpilation/syntax check for edited TSX files: passed.
- PostCSS syntax parsing of the new stylesheet: passed.
- Full npm/Vite build, Laravel feature suite, and runtime browser screenshot comparisons were not executed because npm/composer dependencies are not present in this archive environment.

## Deployment

Extract into the existing Laravel project without replacing `.env` or user media, install dependencies in the target environment, then run `npm ci`, `npm run build`, `php artisan optimize:clear`. No database migration or seeding is required. Keep backups and verify on a staging site before replacing the live assets.
