# PM Circle — authenticated home alignment with public homepage

## Scope

Only the visual shell for `/dashboard` changed. Its existing composer, practice card, interactive feed, member metrics, authorization and database queries were not touched. The public homepage, other member screens, and admin are unchanged.

## Root cause

`MemberHomeHeader` had independently implemented navigation and a 1120px centered header, while the public homepage uses the reusable `SiteHeader` with a 1480px container. The member dashboard body also had its own 1120px maximum width. That caused inconsistent alignment and navigation between the two homepages.

## Changes

- `resources/js/components/dashboard/MemberHomeHeader.tsx`: composes `SiteHeader` with existing `DashboardHeader` authenticated actions instead of duplicating menu links, styles, and mobile-toggle behavior.
- `resources/js/components/pm/SiteHeader.tsx`: optional `brandHref` prop (defaults to `/`, preserving public behavior); authenticated home points it to `/dashboard`.
- `resources/css/pm-member-home.css`: match the public 1480px content/header containers and its 65px/60px responsive header dimensions. The homepage columns use the same 2.21:1 layout ratio. Remove unused member-only header and mobile-menu CSS. Preserve existing member-feed and card styles.

The public header menu content comes from the existing `siteNavigation.header` shared prop on both routes, including admin-edited labels, destinations, ordering, and visibility. No new database queries were introduced.

## Verify locally

```bash
npm run build
php artisan test --filter=MemberDashboardTest
php artisan test --filter=SlidingFeedTest
php artisan optimize:clear
```

In a browser, compare `/` (guest) with `/dashboard` (signed in) at 1440px+, at 880px, and at phone widths. The brand, header navigation positions, and full-width page margins should align; logged-in actions remain search/notifications/account. Confirm composer, feed tabs, reactions, and member panels still function.

## Verification in preparation environment

- TypeScript TSX syntax parsing: passed on both modified files.
- CSS stylesheet parsing: passed.
- Static alignment contract checks: passed.
- Laravel feature tests and Vite production build: not run; installed application dependencies are absent in uploaded source.
