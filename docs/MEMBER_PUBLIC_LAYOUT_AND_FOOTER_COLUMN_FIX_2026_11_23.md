# PM Circle - member/public layout and sidebar/footer separation (2026-11-23)

## Root cause

The authenticated `MemberDashboardLayout` uses a two-column CSS grid: sticky member sidebar (column 1), workspace (column 2). The existing stylesheet positioned the approved `SiteFooter`/`HomeFooter` across `grid-column: 1 / -1`, so it flowed behind the sticky sidebar. Member main content and the footer also used different maximum-width/gutter rules from the public homepage.

## Minimal implementation

- `resources/css/pm-member-sidebar-restore.css`: keep the existing footer in the workspace column on desktop, with the correct footer row in both offer/no-offer variants. At the existing 960px drawer breakpoint, put the footer back in the full-width mobile column.
- Match the member page's content and footer inner widths to the existing public-home rail, constrained by the actual remaining workspace width and the homepage responsive gutters.
- Center directly nested `.pm-container` blocks in full-width authenticated public pages; leave feature-level styling and business logic unchanged.
- At constrained desktop widths, allow the unchanged five footer groups to flow in three responsive columns so their labels remain readable.
- `tests/Regression/memberPublicRailFooterGrid.test.mjs`: protect the shared footer placement, rail, responsive breakpoint, and existing reuse contracts.

## Preserved

No change to the approved footer copy, links, logo, social controls, colors, type, and component markup; no change to member header, sidebar menu/submenu behavior, offers, public/guest layout, routes, payments, AI, authorization, or examinations. No DB migration or seeding.

## Verification performed

- Node static regression suite: 237/237 passed using `node --experimental-strip-types --test tests/Regression/*.test.mjs`.
- `php tests/Regression/SharedFooterCoverageCheck.php`: passed.
- `php tests/Regression/ContactPageAndFooterStaticCheck.php`: passed.
- `php -l app/Http/Middleware/HandleInertiaRequests.php`: passed.
- CSS syntax parsed with `tinycss2`: no errors.
- Headless Chromium/Playwright isolated layout fixture: desktop 1920px, small desktop 1160px, tablet 900px, mobile 390px; also collapsed-sidebar, no-offer, and authenticated full-width content cases. Verified footer doesn't overlap sidebar or overflow viewport, workspace gutters align with footer, footer occupies the correct grid row. This is a geometry smoke test using actual stylesheets, not a running Laravel app or pixel-by-pixel comparison of the real pages.
- Full app/Vite build and Laravel integration tests not performed because Composer/npm dependencies are not included in the provided archive.

## Deploy

Merge the updated source into a staged Laravel checkout, retain the existing `.env`, storage, database, and media. On the destination with compatible Node and PHP dependencies, run `npm ci`, `npm run build`, and `php artisan optimize:clear`; then hard-refresh the browser. No migrations. Confirm footer position on desktop, mobile, and collapsed sidebar before deployment.
