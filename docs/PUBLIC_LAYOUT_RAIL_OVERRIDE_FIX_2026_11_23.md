# PM Circle - guest public rail override correction

## Issue

In the provided course-detail screenshot the header used the homepage rail while
course content still extended close to the viewport edges. The previous
`pm-public-layout-consistency.css` selector for `> main .pm-container` was less
specific than the older `.pm-app:not(.pm-auth-shell) .pm-container` selector in
`pm-prototype.css`. The old global rule therefore won in the CSS cascade,
including at mobile breakpoints. Course details also retained the legacy gray
page canvas.

## Changes

- `resources/css/pm-public-layout-consistency.css`: make the existing shared
  guest-page rail selector specific enough to override the older broad rule,
  including pricing and mobile overrides, while keeping the same
  `--pm-v2-container-width` responsive token used by the homepage header/footer.
- On guest course details only, use the homepage white canvas via `--surface`.
- `tests/Regression/guestPublicRailCascade.test.mjs`: cover the selector,
  header/footer consistency, original course controls, and shared footer reuse.

Existing public header menu/dropdowns, exact approved footer component and
copy, course tabs, membership/enrollment, save/share, member dashboards and
in-progress exams were not changed. No backend, database or migration changes.

## Verification

- Targeted Node regression tests: **11 passed, 0 failed**.
- Full Node regression suite: **226 passed, 1 blocked**. The blocked test
  `activityLogUiGuideline.test.mjs` references the separately named
  `PM_Circle_UI_Style_Guide (4)(8).html` at the project root; it was already
  missing from the supplied archive and was not modified for this change.
- CSS parsed successfully with tinycss2.
- Vite production compilation and rendered browser screenshot parity remain
  unverified: npm dependencies are not installed in this work environment.

## Applying to an existing installation

Use a compatible Node.js version (project specifies 22.18+), replace the files
from this project archive, preserve `.env` and uploaded media, then run:

```sh
npm ci
npm run build
php artisan optimize:clear
```

Hard-refresh the browser or clear any CDN cache so it loads the new CSS asset.
No migration, seed or PHP worker restart is required for this CSS-only fix.
