# Public homepage search — compact header panel

Source: `Archive(9).zip` (2026-11-22). Scope: **homepage search presentation only**.

## Problem
The supplied screenshot shows a tall centered search modal with all topics stacked vertically, distracting from the page. The attached source contains a separate full-header-width search panel, and the included compiled `public/build` assets may not reflect recent changes. A fresh frontend build is necessary to see the source changes.

## Implementation
- Search opens in a compact white popover beneath the Search control in the prototype-style public header, right-aligned with the homepage content container.
- Only four popular links appear before typing. When typing, matching navigation destinations appear alongside the existing search destinations. Results are bounded and scroll inside the panel, avoiding a viewport-sized list.
- Input focus on opening, clear X button, Escape-to-close and return focus to Search, click-outside-to-close, proper accessible labels and focus indicators.
- Width, typography, padding, borders, color, hover and responsive sizing use the existing centralized design tokens. The popover fits narrow mobile viewports.
- **No backend search endpoint, new query, migration, or route change.** Enter still uses Community search; category links still send the query to Community, Daily Challenge, Members or Careers. Only the display is changed.

## Files changed
- `resources/js/components/home/v2/HomeSearch.tsx` — accessible bounded search panel and filtered quick navigation.
- `resources/css/pm-home-v2-layout.css` — remove conflicting full-width search rules, introduce scoped compact popover styles.
- `resources/css/pm-design-tokens.css` — shared search size and type tokens.
- `tests/Regression/publicHomeSearchPopover.test.mjs` — search layout, keyboard, route and no-extra-query regression checks.

## Verification
- Node regression suite with TypeScript stripping: 176 passed, 0 failed.
- Changed TSX transpiles without syntax errors; both changed CSS stylesheets parse.
- Headless Chromium rendering did not finish in this environment; production frontend build and live reference pixel comparison were not verified. Exact visual equivalence to the inaccessible prototype's search-open state cannot be guaranteed.

## Local deployment
Build assets (Node 24 or another package-compatible version):

```bash
npm ci
php artisan wayfinder:generate --skip-database --with-form
npm run types:check
npm run build
php artisan optimize:clear
```

Deploy the **new** `public/build` directory along with changed CSS/TSX source. An old Vite manifest and older cached assets can keep displaying the previous centered modal. If it persists after the build, check the served manifest/build paths and perform a browser hard refresh. No database migration needed.
