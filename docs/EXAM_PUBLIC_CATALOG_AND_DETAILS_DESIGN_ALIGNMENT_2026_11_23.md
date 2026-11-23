# Exam catalog and PMP details – design alignment (23 November 2026)

## Why the implemented type looked heavier

The approved `PM_Circle_Design_Guidelines (1).html` embeds static Inter weights 400, 600 and 700. It declares a 750 heading weight but explicitly says static builds should use the nearest available face. The application loads 800 too, so `font-weight:750` is able to choose 800 and looks heavier than the supplied right-hand prototype. The guide scope now uses the centralized `--pm-guide-static-h1-weight` (700); the declared guide weight remains available for future variable-font use. No application-wide font is changed.

## Changes

- Catalog and PMP details use the **existing** `HomeHeader`, `HomeOfferBar`, and `HomeFooter` through the reusable `PublicLayout`. The `guideLayout` flag sets the approved 1180px layout rail and mobile gutters, without changing the homepage or other screens.
- PMP details now uses the same guide-based typography, page background, color semantics, buttons, card radii and content rail; the content sections and sample-exam component are reused without changing exam logic.
- The administrator-managed PMP footer on/off setting and footer content remain supported, using the common homepage footer structure.
- The PMP detail breadcrumb now links back to the catalog. The existing `Explore the PMP Simulator` link continues to load `/exam-simulator/pmp/details`.
- No new database queries, models, migrations, dependencies or backend route changes.

## Test / deployment

Run `node --test tests/Regression/examPublicSharedGuideLayout.test.mjs tests/Regression/simulatorCatalogGuideCompliance.test.mjs tests/Regression/simulatorCatalogPrototype.test.mjs`, then run `npm ci && npm run types:check && npm run build` under the project's supported Node.js version (22.18+), then `php artisan optimize:clear`. Do not overwrite local `.env` or delete stored media. This is a source-only update; compiled assets must be rebuilt.

## Verification in this package

- 17 targeted JavaScript regression checks: pass.
- PMP multiple-sample PHP static checks and route/controller PHP lint: pass.
- Edited TSX files transpilation/syntax: pass; edited CSS parse: pass.
- Wider Node regression suite: 181 pass, 1 fails because `tests/Regression/activityLogUiGuideline.test.mjs` references an absent root-level `PM_Circle_UI_Style_Guide (4)(8).html` in the original supplied archive. This failure is outside the changed feature.
- Full TypeScript type-check / Vite build: not verifiable in this container, as the project dependencies are not installed and the container uses Node 22.16 (below project tooling minimum).
- Browser screenshot verification: not completed; headless Chromium failed to start in this runtime. Verify the two public pages visually after installing dependencies and building in your working environment.
