# Public Exam Simulator Catalog — Approved Design Guide Alignment

## Source of truth

- `PM_Circle_Design_Guidelines (1).html` in this archive is the approved typography, palette, spacing, controls, radius, responsive-layout and content-width source for the catalog.
- The supplied Browse Exam Simulators screenshot remains the structure and content-order reference.
- Homepage header, promotion bar and footer remain the existing shared components; this update does not redesign them.

## What changed

1. Added shared `--pm-guide-*` semantic tokens to `resources/css/pm-design-tokens.css` using the exact CSS guide values. The new tokens do not overwrite historical global tokens or other pages' colors/fonts.
2. Updated the scoped catalog stylesheet to consume those tokens for Inter, page/section/card type, metadata, label/button weight, guide palette, 4–48px spacing, 8px inputs/buttons, 14px cards, 18px featured panel and 1180px maximum container with 24px/16px gutters.
3. Aligned catalog/banner widths and preserved the card order, filtering, PMP feature panel, review carousel, source images and shared public shell.
4. Removed the hard-coded `Homepage design mockup · Sample content` string from the existing reusable `HomeFooter`, preserving copyright and administrator-managed links and notices.
5. Added `tests/Regression/simulatorCatalogGuideCompliance.test.mjs` for guide mappings and footer regression.

## Unchanged

- No database migration, model, backend controller, authorization, exam scoring, AI, sample questions or admin settings changed.
- Public route `/exam-simulator/pmp` still renders the catalog; `/exam-simulator/pmp/details` retains the previous PMP details page.
- All simulator/learner statistics in the catalog remain identified as sample prototype content, not database figures.

## Verify locally

Use Node.js **22.18+** (or a supported newer version), then run:

```bash
npm ci
node --test tests/Regression/simulatorCatalogPrototype.test.mjs tests/Regression/simulatorCatalogGuideCompliance.test.mjs
npm run types:check
npm run build
php artisan optimize:clear
```

Open `/exam-simulator/pmp` and hard-refresh the page. Because packaged frontend build assets were stale, the full project ZIP intentionally omits `public/build`; run the build before serving it in production or when the Vite dev server is not running. For existing local projects, copy the patch without deleting existing runtime data and then rebuild assets.

## QA status in the packaging environment

- Targeted automated catalog tests: 7 passed.
- Approved guide colors/type/spacing/radius/container and footer phrase static checks: passed.
- CSS stylesheet parsing: passed.
- PHP route syntax: passed.
- Full TypeScript/build check: not completed. The packaging environment has Node 22.16 and npm install failed; required packages and a compatible runtime were unavailable.
- Browser-rendered pixel comparison: not completed in the packaging environment.
