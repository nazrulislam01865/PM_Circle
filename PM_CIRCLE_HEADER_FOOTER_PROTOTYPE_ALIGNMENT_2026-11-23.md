# PM Circle: Public Header Dropdowns and Homepage Footer Prototype Alignment

Baseline: `PM_Circle_Homepage_Navigation_Footer_Prototype_Full_Updated_Project_2026-11-23.zip`.

## Scope
- The homepage-style header now has three reusable dropdowns, with **exact text and order** from the approved screenshot:
  - Exam Simulator: Browse simulators; Compare Plans.
  - Learn & Practice: Browse courses; AI learning tools.
  - Community: Community feed; Daily Challenge; Community events.
- Trends and Events remain standalone top-level links.
- Menu items point to public Laravel routes already in the source. AI learning tools uses the existing homepage AI section anchor because this project has no dedicated public AI tools route.
- Native dropdown behavior: click/touch to open, leave to collapse, Escape to close, keyboard navigation retained.
- On the homepage-style footer, headings, link labels, description, legal notice, copyright and local payment provider labels display the approved prototype wording. The five-column structure, admin-provided social URLs, brand logo, payment images and section visibility toggles are retained. Other footer variants and the admin editor were not changed.
- The dropdown width uses a centralized token; no new package dependency, database query or API endpoint.

## Files updated
- `resources/js/components/home/v2/HomeHeader.tsx`
- `resources/js/components/home/v2/HomeFooter.tsx`
- `resources/css/pm-home-v2-layout.css`
- `resources/css/pm-design-tokens.css`
- `tests/Regression/publicHomeFooterAndHeroNavigationPrototype.test.mjs`
- `tests/Regression/simulatorCatalogGuideCompliance.test.mjs`
- `tests/Regression/publicHeaderFooterExactPrototype.test.mjs` (new)

## Database
No database migrations or seeders. The user-requested text and ordering are display-only changes to the homepage footer, and existing admin settings have not been overwritten. Content shown on other footer variants continues to use the same stored footer record.

## Verification
- 212/212 runnable JavaScript regression checks passed with Node type stripping.
- The excluded Activity Log regression test requires `PM_Circle_UI_Style_Guide (4)(8).html`, which is absent from the baseline archive.
- PHP routes syntax, CSS parsing, and TSX transpilation verified.
- No npm/Vite production build or full visual browser comparison was run in this environment. Build locally with compatible Node and installed dependencies.

## Local application
Extract the small patch at the project root, or use the complete updated source archive while preserving local `.env` and user uploads. Then run:

```sh
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Verify dropdowns and the footer at `/`, plus `/events`, `/learning`, `/simulators`, `/pricing`, `/community`, `/daily-challenge`, `/pm-trends` and the `/#pm-v2-ai` anchor.
