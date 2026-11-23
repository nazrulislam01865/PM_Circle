# PM Circle — Consistent guest header and canonical homepage footer

Source: `Archive 4(1).zip` (latest project). Visual footer source: `PM_Circle_Public_Header_Dropdowns_Footer_Exact_Prototype_Full_Project_2026-11-23 (1).zip`.

## What changed
- `PublicLayout.tsx`: every unauthenticated page now renders the existing `HomeHeader` with its original dropdown items and its `pm-home-v2-shell` styling. Existing authenticated/member behavior is retained.
- `AuthPageFrame.tsx`: login/signup/forgot-password guest views now use `HomeHeader`; authenticated onboarding retains its existing header.
- `DiscoverShell.tsx`: unauthenticated Discover PM views now use `HomeHeader`; authenticated views keep their original header.
- `HomeFooter.tsx`: restored the approved reference homepage footer markup and wording. Imported its existing shared identity component (`FooterIdentity`) to avoid circular imports from the legacy footer compatibility entry point.
- `pm-learning-course-detail.css`: the guest course-details content rail now matches the header/footer and approved course catalog rail; curriculum, tabs, enrollment and access logic are untouched.
- Updated the static header regression contracts and added `guestHomeHeaderEverywhere.test.mjs`.

## Behavior and constraints
- No PHP route, middleware, controller, model or migration changed. No additional database query or endpoint.
- Footer uses the existing shared cached `siteFooter` data and visibility settings. The legacy `PmpPublicFooter` delegates to `HomeFooter` already in Archive 4, so only one footer visual implementation remains.
- The homepage header dropdown labels and destinations were not changed.
- Member dashboards and active timed exams continue using their existing navigation and footer policy.
- The existing course detail components and enrollment rules were preserved; this is not a course-content redesign.

## Verification
- JavaScript regression suite: 224 passing, 1 unrelated test startup failure because `PM_Circle_UI_Style_Guide (4)(8).html` is absent from the uploaded project.
- Targeted 16/16 checks passed for public header, footer and guest-shell tests before the wider run.
- PHP footer static checks passed.
- Changed TSX transpilation and CSS parsing checks passed.
- Full Vite build and browser pixel comparison were not performed in this environment, which lacks npm dependencies.

## Apply
Extract the patch over the project root, then run `npm ci`, `npm run types:check`, `npm run build`, and `php artisan optimize:clear` on the local machine with the project-configured compatible Node version.

No migration or seeder is required.
