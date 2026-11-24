# AI Resume Assistant public prototype — 24 November 2026

- Added `/ai-resume-assistant` as an Inertia static preview; no new page-specific DB, AI or upload request. Existing private profile imports, AI services, permissions and subscription logic are unchanged.
- Reuses `PublicLayout siteLayout homePrototype guideLayout`, the homepage header/footer/offer, legal banner and breadcrumb styles, `HomePhoto` fallback behavior, existing guide buttons and centralized Inter/type/color/spacing tokens. Page-specific CSS only defines scoped composition and maps roles to existing tokens. Mobile stacks the image panels and review comparisons.
- Two missing photo crops were extracted from the owner's screenshot (experience and import), optimized as WebP. Four other photographs are reused from existing homepage assets. These source crops have limited resolution; no external image fetches.
- Two study links point to NBER working paper 30886 and Ladders' 2018 study. Study figures and sample rewrites are illustrative and not PM Circle performance results.
- Homepage resume CTA defaults to the new route. Existing explicitly configured admin destinations are preserved. If the prior destination was saved as `/careers` or `/register`, select `/ai-resume-assistant` under Admin > Homepage > Opportunities & resume > Resume button destination and save. The existing route validation supports this local path. No migration or seeding needed.
- Guest CTA links to existing registration/login; signed-in members can open their existing private imports tab.

## Verification

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 265 passed, 0 failed (5 new checks).
- `php -l` on route and homepage admin controller: passed.
- TSX transpilation syntax: passed for the new page. Isolated Chromium rendering with existing built CSS and current source styles, using a mocked shell and image components, verified all six images, five step rows, four examples, Inter typography and no horizontal overflow at 1640, 1050, 768, 390 and 320 CSS pixels. This is not a live Laravel/Inertia integration or full-page pixel comparison.
- Production build blocked: `vp` not installed (no node_modules in input). PHP integration tests not executed because vendor dependencies are absent. Existing compiled assets are unchanged and must be rebuilt before use.

## Deployment

Use supported Node.js (22.18+ or compatible version from lockfile), install dependencies when needed, `npm run build`, then `php artisan optimize:clear`. Check `/ai-resume-assistant` and homepage CTA in a browser. No migration, reseed or production changes made.

## Side-by-side prototype correction

The owner's desktop screenshot showed that the shared 32px chart statistic role was too large and that the generic guide palette differed from the approved editorial preview. Only opt-in editorial roles were added to `pm-design-tokens.css`; the public resume stylesheet now uses them for 28px statistics, compact heading tracking, the sampled #124d88 accent, #eff6ff panel surface, and #eaf7ee / #d6ecdd suggested-rewrite surface and border. The main inset and study gap were tightened; feature copy starts at its existing inset. The centralized Inter family, body size (16px), line height (1.6), H1, existing buttons and shared layout are unchanged. Optical sizing is disabled for this preview to match the static optical-size faces in the supplied HTML guide. No font asset or external dependency was added; actual deployed font loading still requires local browser verification.

- 267 regression checks passed, including two new editorial-role tests.
- Isolated Chromium content preview (using the supplied guide's embedded Inter faces, existing built CSS plus source corrections, mocked layout) checked at 1640, 1050, 768, 390 and 320 CSS pixels: no horizontal overflow, all six images, five workflow rows, and four review examples present. This is not a live Laravel/Inertia page comparison.
- The existing header, footer, routes, data, authentication, member resume editor, and compiled frontend assets were not changed. Rebuild with `npm run build`; production build cannot run here because `vp` is absent. No migrations or seeding.
