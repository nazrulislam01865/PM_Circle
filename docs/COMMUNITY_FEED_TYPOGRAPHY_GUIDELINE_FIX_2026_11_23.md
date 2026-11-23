# Community Feed — HTML design guideline typography fix (23 Nov 2026)

## Verified cause

The earlier app-wide audit confirmed all values were CSS variables, **not** that the variables were assigned to the correct semantic roles. In `resources/css/pm-circle.css`, the discussion H1 used `--pm-font-size-32px`, which aliases the statistic size `--text-stat` (32px), rather than the responsive HTML-guide H1 `--text-h1` (32–49.6px). The scenario-card H3 used the former `--pm-font-size-20px` alias, which maps to responsive H2 (24–32px) instead of H3 (18px). Mobile and member CSS had separate downgrades. The archive also includes old compiled Vite assets, so changes in source require a frontend build.

## Implementation

- `resources/css/pm-circle.css`: Map discussion H1, lead, public badge, search input and guest callout to their proper centralized tokens; scope the community-right-sidebar H3, kicker and paragraph role corrections to the discussion page only.
- `resources/css/pm-member-pages.css`: Use the same H1 and lead typography on authenticated discussion pages, retaining the member-specific layout.
- `resources/css/pm-mobile-content-polish.css`: Keep H1, lead and metadata typography at the guide roles on small screens rather than shrinking H1 to H2 or badge to micro type.
- `resources/js/pages/community/Feed.tsx`: Replace three old presentational font aliases in the sidebar with the approved shared H3/body tokens. Navigation, feed loading, search and post actions untouched.
- `tests/Regression/communityFeedGuideTypography.test.mjs`: Five tests protect semantic role mappings across public, logged-in and mobile variants.

The authoritative HTML guideline supplies Inter; H1 `clamp(2rem,5vw,3.1rem)`; lead `1.0625rem`; body `1rem/1.6`; H3 `1.125rem`; metadata `0.875rem`.

## Verification and deployment

- Community typography tests: 5/5 PASS.
- Node regression suite: 253/253 PASS.
- CSS parser: all 83 stylesheets parse.
- No database migration, service changes, dependencies, header/footer modifications or content changes.
- Browser-based pixel comparison and production build: **not verified**. The source archive contains the pre-existing `public/build` assets; rebuild using Node >=22.18 and `npm ci && npm run build`, then `php artisan optimize:clear` and hard-refresh. If the built page is served behind a cache/CDN, invalidate cached CSS/JS.

This is a targeted fix of the reported Community Feed; it is **not** a guarantee of per-page pixel-perfect verification of the entire site.
