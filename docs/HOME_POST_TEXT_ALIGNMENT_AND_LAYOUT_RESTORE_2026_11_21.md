# PM Circle - Public homepage V2 post alignment and layout restoration

## Scope and source

Based on the last delivered `PM_Circle_Home_Shared_Layout_Pencil_Footer_Fix_20261121.zip`, incorporating the user-provided screenshot (21 November 2026, 11:04 PM) and the request to restore the immediately preceding homepage content layout. No backend/domain logic was modified.

## Changes

1. `resources/css/pm-home-v2-sections.css` — Set a single logical start indent for the Daily Challenge content and Post Card V2 content so the heading, paragraphs, images, chips and Read discussion link align beneath the author name, matching the existing community card convention. Preserve full-width reaction bars and existing handlers. The official PM avatar uses the same shared size token.
2. `resources/css/pm-design-tokens.css` — Restored the previous homepage-specific 90rem / 70.2vw content rail and added centralized avatar and post-indent tokens. The separate shared public-page width remains unchanged. Kept Inter and the existing centralized homepage font-size tokens.
3. `resources/css/pm-home-v2-responsive.css` — Restored the previous 1500px and 1050px homepage rail breakpoints. At 42rem and below, post content becomes unindented, consistent with the existing responsive community card pattern.
4. Regression tests in `tests/Regression/publicHomeLayoutCentralization.test.mjs` and `tests/Regression/publicHomepageV2.test.mjs` updated to verify the restored rail; added `tests/Regression/publicHomePostTextAlignment.test.mjs` to verify post text alignment, responsive behavior and typography centralization.

## Preserved

- Pencil icon in discussion composer and join/auth flow.
- All API routes, comments, reactions, moderation, AI/learning features, course data, user permissions, and footer admin controls.
- Footer five-column design, page section order, and homepage CSS font sizes from the last delivered project.
- Other public-page and authenticated-page widths.

## Typography audit

Homepage V2 CSS: `pm-home-v2-layout.css`, `pm-home-v2-sections.css`, `pm-home-v2-responsive.css`. The font family references the central `--font-ui` (Inter); nonzero homepage font sizes reference `--pm-v2-*` or existing central tokens from `pm-design-tokens.css`. The tokens control type styling centrally; no change to other pages' typography was made.

## Verification

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 172 passed, 0 failed.
- Targeted homepage/test file run: 13 passed.
- `tinycss2`: relevant four stylesheets parsed with zero errors.
- Source archive hashes matched the previously delivered ZIP for checked baseline component files.
- Chromium headless render of a static alignment fixture could not start successfully; no rendered pixel comparison or production Vite build was completed.

## Build/deployment

On an environment with compatible Node.js (24 LTS recommended), PHP 8.4 and project dependencies available:

```sh
npm ci
php artisan wayfinder:generate --skip-database --with-form
npm run types:check
npm run build
php artisan optimize:clear
```

Back up the current source and use staging; do not replace production until the compiled homepage is visually verified. No migrations are required. Keep production `.env`, uploaded media and persistent storage unchanged.
