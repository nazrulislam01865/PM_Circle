# Public header style parity — 2026-11-25

## Root cause

All ordinary guest public content routes already use `HomeHeader` through `PublicLayout`; login/signup use `AuthPageFrame`, and Discover PM uses `DiscoverShell`. Pricing's legacy `.pm-pricing-shell .pm-brand-copy small` rule applied to the shared brand, overriding letter spacing, weight, color and margin. This changed the logo block width and shifted navigation even though the header component was the same. Other broad legacy brand selectors were also audited.

## Scope

- Confine legacy pricing, signup and old homepage brand selectors to legacy chrome. Shared header/footer branding now uses its own existing central design tokens instead of page-level overrides.
- Explicitly inherit the approved central UI font in the shared header and move the existing Trends active-link rule into the shared header stylesheet.
- Retain the `HomeHeader` markup, shared rail, responsive behavior, menus, existing home-content visibility settings, promotional bar, search, links, page banners and member navigation. Help Centre stays in the public footer only. No changes to admin or protected authentication workflows.
- No PHP, data, route, dependency or schema changes.

## Verification

- Source regression suite: 421/422 passed (`node --experimental-strip-types --test tests/Regression/*.test.mjs`); existing PMP counter/AI usage assertion failed as before.
- Targeted header/banner tests: 16/16 passed.
- Offline Chromium fixtures using the actual shared header/layout component markup, project CSS and guideline font: 64/64 computed header parity comparisons passed across eight page variants against the homepage at eight widths (320–2048px). The pricing baseline showed mismatched brand typography and navigation geometry. Fixtures use stubbed icons and omit live network/auth state and the promotion bar; they are not full application tests.
- Production build and live Laravel/browser integration not run (dependencies not installed in this environment).

## Apply

Rebuild the frontend (`npm run build`), confirm `public/build/manifest.json` exists, then `php artisan optimize:clear`. No migration or reseeding. Retain `.env` and existing storage.
