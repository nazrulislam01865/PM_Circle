# Public Learn & Practice prototype alignment — 2026-11-23

## Scope

Source: supplied `Archive 8.zip`; visual reference: supplied Learn & Practice screenshot; type/spacing/colors/buttons: supplied `PM_Circle_Design_Guidelines (1)(1).html`.

- Public `/learning` now uses the approved light catalog layout: shared homepage offer/header/footer; breadcrumb/hero; three-question starting-point dialog; six topic chips; filter sidebar; search and sort; five horizontal course cards per page; pagination; closing editorial note.
- Published course content is still supplied by the **existing** `LearningController@index` and `DemoCourseCatalog::all` flow. No new endpoints, Eloquent queries, migrations, or pricing logic were introduced.
- Links go to the existing `/learning/courses/{slug}` detail pages. Enrollment, saved courses, restricted lessons, and practice continue through the existing course detail and member flows.
- `/dashboard/learning` retains the existing tabbed workspace and its save/enroll behavior; only public `/learning` renders the new catalog component.
- The starting point dialog is self-contained and chooses a currently published course from existing Inertia props; it stores no profile data and calls no AI or server endpoint.
- The reference uses illustrative ratings/learner counts; these are explicitly labelled **sample** and are presented only for five exact prototype titles, not as actual database figures. Other courses show only genuine category, level, access, and duration fields.
- The approved HTML tokens `--pm-guide-*` drive the typography, 16px body, 14px controls/meta, 44px minimum control height, palette, spacing, focus states, borders and radii. Layout uses the existing homepage prototype rail, limited by the HTML guide's 1180px max-width, and its responsive gutters. This applies only to the new catalog.
- Existing homepage header/footer components are reused, not reimplemented or modified.

## Source files

- `resources/js/pages/learning/Catalog.tsx`: routes public rendering to new component, retains existing authenticated member workspace.
- `resources/js/components/learning/PublicCourseCatalog.tsx`: new public catalog UI, reusable course row, and three-question recommendation dialog.
- `resources/css/pm-learning-public.css`: page-scoped layout and responsive design using centralized tokens.
- `resources/css/pm-design-tokens.css`: non-breaking semantic shared rails/dialog tokens; existing variable values remain intact.
- `resources/css/app.css`: imports new scoped stylesheet.
- `tests/Regression/learningPublicPrototype.test.mjs`: source and design contract checks.

## Verification

- 199 JavaScript regression checks passed with Node's experimental TS stripping. The uploaded archive had a pre-existing Activity Log test that expects a root-level style guide; a temporary **symlink to the bundled file** was used during tests and removed afterward.
- Modified TSX files successfully parsed/transpiled with the installed global TypeScript tool.
- Central-token and CSS parsing checks passed with tinycss2.
- Frontend `npm ci` cannot complete offline because `yuku-parser@0.19.0` is absent from npm cache and the registry cannot be reached here. Therefore full `npm run types:check`, Vite compilation, and an actual Inertia browser render are not verified.
- Chromium's separate static visual preview timed out; it is excluded from the delivery and is **not** counted as visual QA.

## Deploy locally

Use Node >=22.18 with network access, then:

```sh
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Hard-refresh `/learning`. Check desktop and mobile layouts and `/dashboard/learning` separately. No database migrations or deployment required.
