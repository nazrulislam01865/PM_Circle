# Homepage — How AI helps you on PM Circle (18 November 2026)

## Source and position
- Based on the supplied four-card screenshot and the approved PM Circle UI style guide included in the archive.
- **Public homepage**, immediately after `HomePathway` (ending with the professional/technical skills banner) and before the `ScenarioPreview` / community showcase.
- Shown with the homepage whether the viewer is anonymous or authenticated; this is a marketing section, not an AI execution endpoint.

## Implementation
- `resources/js/components/home/HomeAiFeatures.tsx`: small, reusable typed card component with all four approved card titles/descriptions, accessible icons, the main heading, and a working `/pricing` link.
- `resources/js/pages/public/Home.tsx`: imports/renders new component once, between existing sections.
- `resources/css/pm-home-ai.css`: scoped layout rules; four equal columns on desktop, two on tablet, one on narrow mobile.
- `resources/css/pm-design-tokens.css`: central color tokens for the new gradient, CTA, border and shadow. Shared typography, spacing, button (`pm-button`), and radius tokens are reused; no global redesign.
- `resources/css/app.css`: registers this scoped stylesheet with the project's existing imports.
- `public/images/home/ai-features/*.webp`: four optimized illustrations cropped from the **user-supplied prototype screenshot**. Text below the images stays HTML rather than becoming part of a noneditable screenshot. All images are local and lazy-loaded.
- `tests/Regression/homeAiBenefits.test.mjs`: static source tests to guard placement, copy, image paths, and responsive breakpoints.

## Performance / security / data
- No routes, migrations, PHP, database queries, API calls, queues, AI integrations, or new npm dependencies.
- Four local WebP illustrations total approximately 62 KB. Images use dimensions, lazy loading and async decoding to reduce layout shift and network usage.
- Existing authentication, subscription rules and learning/exam logic are unaffected. Marketing claims match the supplied prototype; the component does not independently enable AI functionality.

## Checks actually run
- 12/12 node regression tests passed (`homeAiBenefits.test.mjs` and `memberNavigation.test.mjs` under `--experimental-strip-types`).
- New and modified TSX compiled by the TypeScript `transpileModule` syntax checker without errors.
- `pm-home-ai.css`, `pm-design-tokens.css` and `app.css` parsed without top-level syntax errors using `tinycss2`.
- Existing `/pricing` route confirmed in `routes/web.php`.
- Chromium screenshot attempt was blocked by the tool environment; **integrated visual/browser check is not claimed**.
- Full `npm ci`, Vite build, Laravel feature suite and DB checks not performed here (dependencies not installed in provided archive).

## Local verification / deployment
```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
node --experimental-strip-types --test tests/Regression/homeAiBenefits.test.mjs
```

Review the homepage at desktop, tablet and mobile viewport widths after building; verify the new section appears after the skills banner and before Today's scenario, images load from `/images/home/ai-features/`, and Explore Plus plans opens `/pricing`.

**No migration required.** Existing production data is unchanged.
