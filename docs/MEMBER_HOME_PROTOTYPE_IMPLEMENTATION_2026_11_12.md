# Member home prototype alignment (12 November 2026)

Scope: **authenticated `/dashboard` only**. No database schema, application queries, subscriptions, post interaction services, admin controls, or public homepage changed.

## Layout

- Dedicated horizontal authenticated home header with PM Circle branding, Home, Daily Challenge, Community, Learn & Practice (grouped Learn/Simulators menu), Careers menu, Members, search, notifications, and account controls. Existing shared site navigation visibility/labels are respected for the five prototype sections.
- Sidebar is not rendered on `/dashboard` only; other member workspaces retain their existing sidebar.
- Two-column layout centered on desktop and stacked on narrow screens, using current theme color and centralized type/spacing/control tokens.
- Reuses the existing post composer, published scenario card, feed filters, cursor-loaded posts, and engagement actions. Interactions and entitlements are untouched.
- Compact right-hand My profile, Your learning, and Profile insights cards consume the existing dashboard projection. No new database queries.
- On the member home, the scenario presentation is the same for all plans rather than displaying the previous premium-only simulated-ERP example; simulator access remains available in the top Learn & Practice menu.

## Updated paths

- `resources/js/components/dashboard/MemberHomeHeader.tsx` (new)
- `resources/js/components/dashboard/MemberHomeOverview.tsx` (new)
- `resources/js/components/dashboard/DashboardHeader.tsx` (optional compact header controls)
- `resources/js/components/dashboard/DashboardComposer.tsx` (optional compact avatar)
- `resources/js/components/dashboard/DashboardPracticeCard.tsx` (optional homepage scenario presentation)
- `resources/js/components/dashboard/DashboardFeed.tsx` (accessible feed anchor and scenario shortcut)
- `resources/js/components/pm/Brand.tsx` (optional link target, defaults to previous `/`)
- `resources/js/layouts/pm/MemberDashboardLayout.tsx` (member-home variant)
- `resources/js/pages/account/Dashboard.tsx` (homepage composition)
- `resources/css/pm-member-home.css` (new, scoped theme styles)
- `resources/css/app.css` (imports scoped stylesheet)

## Verification / deployment

Source-level TypeScript transpilation and CSS parsing passed. Full Vite/TypeScript build and browser screenshot QA were **not** completed in the packaging environment because the dependency install timed out. Run locally using Node.js 24.11+ and PHP 8.4+:

```bash
npm ci
npm run build
php artisan optimize:clear
php artisan test --filter=Dashboard
```

Check the desktop and mobile layout, anonymous-post entitlement, dropdown keyboard behavior, composer posting, comments, feed filters and infinite scroll, and existing member learning pages.
