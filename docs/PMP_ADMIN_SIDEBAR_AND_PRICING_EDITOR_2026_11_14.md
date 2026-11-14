# PM Circle - PMP public-page administration layout refinement

## Scope

Only the PMP public-page administration UI and its sidebar integration are changed. The public PMP page, paid exam simulator, question scoring, database schema, content JSON structure, image upload endpoint, authentication, and permission checks are unchanged.

## Editor behavior

- The existing admin sidebar contains an expandable **PMP public page** group with Banner, Benefit cards, Sample question, AI study help, Plan comparison, FAQ, Video stories, Testimonials, and Footer. There is no duplicate tab menu in the editor content.
- Selecting a section inside the editor switches it locally without an extra network request. Direct `?section=plans` links are allowlisted and supported on the server. The current section is retained after saving.
- Standard fields, card titles, descriptions, footer controls, and other content appear in a single vertical form column.
- Card icon fields show the current 36x36 icon and use the existing authenticated upload control. Existing icon identifiers remain in the stored content but are not exposed as dropdowns.
- Plan comparison has a feature-definition list (label plus text/checkbox type) and then four separate plan columns. Each plan's name, subtitle, button text and corresponding feature values appear sequentially in that column; the existing 4-cell data structure is preserved.
- The plan columns responsively adapt to two columns on medium viewports and one on small viewports.

## Modified files

- `resources/js/layouts/admin/AdminLayout.tsx` - expandable PMP subsection navigation and selected state.
- `resources/js/components/admin/pmp-public-sections.ts` - centralized nine-section order and labels.
- `resources/js/pages/admin/PmpPublicPage.tsx` - single-column editor, icon uploader preview and plan-oriented editor.
- `resources/css/pm-admin.css` - scoped layout and responsive styles using existing design tokens.
- `app/Http/Controllers/Admin/PmpPublicPageController.php` - allowlisted section deep links and preserving section on save.
- `tests/Regression/PublicPmpPrototypeStaticCheck.php` - updated PMP structure assertions.
- `tests/Feature/Admin/PmpPublicPageAdministrationTest.php` - section routing and save redirection test.

## Verification and deployment

Static PMP and shared-header regression checks, PHP syntax, modified TypeScript/TSX parsing, and CSS parsing passed in the build environment. The archive contains no installed `vendor` or `node_modules`, so Laravel runtime feature tests and complete type/build checks must be run locally. No migration is required.

From project root:

```sh
php artisan optimize:clear
npm run types:check
npm run build
php tests/Regression/PublicPmpPrototypeStaticCheck.php
php tests/Regression/SharedHeaderPrototypeStaticCheck.php
APP_ENV=testing php artisan test --filter=PmpPublicPageAdministrationTest
APP_ENV=testing php artisan test --filter=PublicPmpExamPageTest
```

Verify visually in the administrator UI at `/admin/exam-simulator/pmp`, including 1920px, 1366px, tablet, and mobile widths. The edit form uses the existing revision check, and no public website data is changed until an administrator presses Save changes.
