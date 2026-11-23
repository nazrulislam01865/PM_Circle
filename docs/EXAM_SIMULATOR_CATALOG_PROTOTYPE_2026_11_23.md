# Public exam simulator catalog - approved prototype

## Scope
- Added `/simulators`, `/exam-simulator`, and the existing `/exam-simulator/pmp` public entry point as the catalog depicted in the approved image and `PM_Circle_Design_Guidelines (1).html`.
- Uses `PublicLayout siteLayout homePrototype` and existing `HomeHeader`, `HomeOfferBar` and `HomeFooter` (through `SiteFooter`). Shared cached `rewardPromotion` controls both the promotional offer and banner; a disabled offer is not fabricated.
- Uses supplied prototype photos from `/public/images/home/prototype/`. Search, certification/availability/access filters, filter reset, result count, empty state and sample-review paging all execute in React without network requests.
- Five card entries and their ratings/testimonials are *illustrative prototype content*, not live question bank, plan entitlements or certified availability. The page includes the disclosure text from the reference. Their details lead to the preserved PMP details page or accurate existing/new ComingSoon status pages.
- Reuses the central typography/color/spacing tokens, with catalog-specific scoped rules; desktop has a three-card row, spotlight and remainder. Tablet/mobile layouts reflow without horizontal overflow.

## Non-changes
- Kept the guest PMP landing at `/exam-simulator/pmp/details`, sample-question bank, admin settings, authenticated exam flow and existing homepage/header/footer UI unchanged.
- No migration, model, service, payment or new exam database query.

## QA
- `php -l routes/web.php` passes.
- `node --test tests/Regression/simulatorCatalogPrototype.test.mjs` passes (4 tests).
- The new TSX files pass TypeScript's syntax/transpile diagnostics.
- Full `npm run types:check` and `npm run build` were not confirmed in this environment because dependency installation was incomplete (npm cache miss and incompatible Node 22.16 with packages requiring Node >= 22.18).

## Deploy
On a development environment with a compatible Node release and working package registry:

```sh
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Deploy only after confirming the built assets render as expected, and retain the existing PHP version, Redis workers, and database. No database migration is needed for this change.

## Public entrypoint correction
- `/exam-simulator/pmp` now renders the approved Browse page instead of the former PMP-only page.
- PMP card and spotlight actions open `/exam-simulator/pmp/details` for the preserved sample-question experience. The admin preview uses the same details URL.
- Exam question/attempt/scoring routes remain unchanged. Tests that exercise the detailed sample-question page use its new URL.
- This is a URL change for the previous guest PMP landing; existing external links to `/exam-simulator/pmp` now reach the catalog.

## Package note
- Stale pre-change `public/build/` files are intentionally omitted from the corrected archive. Run `npm ci` and `npm run build` after extraction (Node >=22.18), then clear Laravel caches. Without compiling updated frontend assets, the new Inertia component may not be resolvable.
- Empty Laravel session/cache/view/log directories are retained using `.gitignore` files to prevent the prior session-file 500 after ZIP extraction.
