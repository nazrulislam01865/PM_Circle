# Learn & Practice — shared Browse courses prototype

Source: Archive 2(3).zip; supplied screenshot and PM_Circle_Design_Guidelines (1)(6).html (identical to the guide in the archive).

## Changes
- `resources/js/components/learning/PublicCourseCatalog.tsx`: common course listing for public and signed-in routes, prototype breadcrumb, title, starting-point banner, topic chips, horizontal five-field filter toolbar, result count, vertical course tiles, pagination and course development note. The existing recommendation algorithm and question set are reused. Existing course metadata is displayed, images use the existing local fallback and lazy decoding, and sample ratings remain explicitly disclosed only when shown. No new ratings or learner counts are generated.
- `resources/js/pages/learning/Catalog.tsx`: default `/dashboard/learning` and `?tab=courses` use the same catalog as `/learning`. Explicit `my-learning`, `paths`, `practice`, `exams` keep the prior member workflow. Selecting All Courses from the legacy workspace opens the shared listing. The existing course detail URL is used for each route. Enrollment and save actions remain available on the existing course detail page rather than adding controls absent from the prototype.
- `resources/css/pm-learning-public.css`: scoped shared responsive grid, horizontal filters, card heights and control alignment using the existing central typography, color, spacing, border and button roles. Five tiles per page; columns reduce as the available rail narrows. Uses the existing shared mobile filter disclosure and pagination. No independent font scale.
- `resources/css/pm-member-body.css`: catalog bottom spacing correction only.
- `tests/Regression/learningPublicPrototype.test.mjs`: updated existing route/fallback assertions and added prototype layout assertions.

## Preserved
Public and authenticated layouts, routes, DB-backed course catalog, course detail, member-only learning paths/practice/exams, membership and enrollment checks, bookmarks on the detail page, existing course images and existing database schema. No new dependencies, queries, endpoints, migrations, or AI calls. The supplied guide's Inter typography and minimum 44px controls take precedence over smaller prototype text and its alternate font. Existing public rail is retained.

## Verification
- 19/19 targeted source regression tests passed (catalog, shell, pagination and mobile contracts).
- Full source regression suite: 401/402 passed, the remaining Exam Simulator counter/AI overview assertion is present in the original archive.
- Offline Chromium fixtures: actual catalog TSX transpiled with mocked React/Inertia and layout shell, project CSS and supplied guide font. Public and member at 1600, 1440, 1024, 768, 390 and 320px. No outer overflow, equal action button baseline per first row, correct 18px/16px/14px typography and minimum 44px action height. Five columns at 1440/1600; narrow widths adapt.
- These are not end-to-end browser tests. Full TypeScript project checking, Laravel integration and production compilation could not be completed: Node v22.16.0 is below the locked Vite Plus requirement, and offline npm installation fails with ENOTCACHED for yuku-parser 0.19.0.

## Deployment
Retain live .env and storage, extract patch into project root. Run `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear` with supported Node (22.18+ in Node 22). No migration/reseed. Verify public `/learning`, logged-in `/learning`, and `/dashboard/learning?tab=courses`; check filters, pagination, recommended course dialog and existing course enrollment and bookmarking on detail page.
