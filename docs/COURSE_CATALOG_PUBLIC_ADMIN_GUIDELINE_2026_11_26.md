# Course catalog and public course detail design correction (2026-11-26)

## Root cause
`PublicLayout` enabled the common public banner and public homepage rail only for unauthenticated visitors. Administrators viewing public courses therefore received the older `SiteHeader` and legacy in-page headings. Member course catalog/detail pages did not opt in to the common banner. The catalog used a four-item page rather than the supplied five-card prototype.

## Changes
- Treat administrators browsing `PublicLayout` as public-site viewers for presentation only; retain the Administration destination and the existing completed-member sidebar branch. Auth/onboarding-specific layouts and authorization rules are not changed.
- Share `PublicPageBanner` with catalog and detail views, with explicit opt-in for member mode and the correct member breadcrumb home destination. Suppress duplicate legacy headings through the existing banner context.
- Five courses per page; five equal-height columns where the rail has sufficient width, with progressively smaller responsive grids. Keep existing filtering, starting-point flow, published catalog, safe image fallback and shared pagination. Restore the explanatory course-development section in the latest supplied prototype; sample metrics remain explicitly identified.
- Use existing design tokens for title, body, meta, controls, cards, semantic colors, and spacing. Course detail uses an image-and-metadata card, common banner and shared layout, with a responsive content/enrollment rail. Preserve enrollment, practice, saved courses, resources and sharing; administrator preview does not show a member onboarding CTA.
- Keep the static Inter font convention already defined by the approved guide. No new font assets or dependencies.

## Verification
- Node source regressions with `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 471 passed, 2 failed. Original uploaded archive: 468 passed, same 2 failed (PMP mock counters and legacy profile header). Three new targeted regression tests added; existing expectations updated for intentional changes.
- TSX syntax transpilation: 5 changed files passed. CSS parser: 4 changed files passed.
- Chromium static layout fixtures using the source CSS at 1668, 1440, 1100, 1024, 768 and 390 CSS pixels: 24 guest/admin catalog/detail combinations, aligned content/banner rails, no document horizontal overflow, computed 16px body and 14px buttons, matching banner headings and gradient. These fixtures are representative markup, not a live authenticated Laravel session or an end-to-end functional test.
- No installed Composer or npm dependencies were available. Production build, full type checking, actual loaded font delivery, and authenticated runtime visual/functional tests remain unverified.

## Deployment
Preserve the existing .env, database and private uploads. Install dependencies if necessary and run `npm run types:check`, `npm run build`, `php artisan optimize:clear`, `php artisan optimize`. No migration, seed, query or permission changes. The delivered source archive excludes old public/build assets, compiled Laravel caches, sessions, logs and Inertia debug snapshots; rebuild the assets before running or deploying.
