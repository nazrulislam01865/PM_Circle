# PM Circle — Public Events Design Guideline Alignment (23 November 2026)

## Scope and reference

Source: Archive 7.zip. Approved visual reference: Community Events listing and "Starting a career in software delivery" details screenshots. Typography, spacing, colors, controls and layout contract: `PM_Circle_Design_Guidelines (1).html` included in the original archive.

## Correction

- Listing and details share the approved 73.75rem maximum width with 1.5rem gutters (1rem on narrow mobile). Removed the event-only `70.2vw`/`90vw` width override. The existing header and footer already share the guide rail through `PublicLayout` and the guide public shell.
- Existing Inter font is inherited from centralized `--pm-guide-font`. Standard text paragraphs are `--pm-guide-text-body` (1rem/16px, line-height 1.6); metadata and form labels remain `--pm-guide-text-meta`/`--pm-guide-text-control` (.875rem/14px).
- Reused guide controls: `.pm-guide-button`, `.pm-guide-control`, `.pm-guide-field-label`. Defined centrally in `resources/css/pm-ui-guideline.css`; colors, sizes and weights come from `pm-design-tokens.css`. Event-only CSS now contains layouts and visual variants rather than duplicate control rules.
- Inputs use the required `--pm-guide-control-line` (#7c91ac), 44px touch-friendly minimum height, 8px radius, and shared focus styling. Buttons use blue #075db3, hover #064c93, weight 650, 14px text, 8px radius and 44px minimum height. Compact ad-navigation controls retain their prototype-specific height for visual parity.
- Event cards retain their 14px border radius and screenshot-specific event/advertisement styles. Title weights and support-copy sizes map to the central guide tokens. The H1 uses the central static-Inter mapping of 700, the nearest rendered face to the guideline's nominal 750 with the actual installed static font family; this avoids the visually heavier global Inter 800 face reported earlier.

## Behavior preserved

- Same GET `/events` and `/events/{slug}` routes and existing public event source.
- Homepage header Events link and footer Events fallback still navigate to `/events`.
- Original advertisement carousel, search, filters, sorting, 10-item pagination, sponsored card and linked detail pages.
- Original detail image, agenda, venue, related events, registration preview and public discussion preview.
- Registration and comments remain local to the browser tab and DO NOT create bookings, persist comments, or send mail.
- No controller, model, migration, database schema, auth or exam changes.

## Verification completed

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: **195 passed; 0 failed**. Used a temporary *symlink* to the style guide already present at `pmDoc/PM_Circle_UI_Style_Guide (4)(8).html` because one unrelated Activity Log test expects a root-level copy. Symlink removed after tests.
- Targeted event regression tests: **6 passed; 0 failed**.
- PHP syntax: event controller and `routes/web.php` passed `php -l`.
- TypeScript modified TSX files: syntax/transpilation checks passed with installed TypeScript module.
- CSS: `tinycss2` parser reported no syntax errors in all three modified stylesheets; event tokens resolved to the central token sheet.
- A real Chromium browser screenshot comparison could not be completed because headless Chromium timed out in this execution environment. Full Vite/TypeScript project build remains unverified because `node_modules` is absent and environment Node.js 22.16.0 is below the toolchain minimum. Browser/device pixel-level matching must be verified after a local build.

## Apply

1. Extract the patch over the existing PM Circle project (keeping `.env`, uploads and database unchanged), or use the complete project source ZIP.
2. Use compatible Node.js (22.18+ or another supported release), then run `npm ci`, `npm run types:check`, `npm run build`.
3. Run `php artisan optimize:clear` and check `/events`, `/events/project-delivery-career` on desktop/tablet/mobile.
4. Do not run destructive migrations: **no migration is needed**.

The complete source ZIP intentionally excludes old `public/build` assets, local session/cache files and debug runtime data so the compiled frontend must be freshly rebuilt.
