# PMP Exam Import and Shared Navigation Update — 2026-11-16

## Source of truth

Started from user-supplied `Archive 2(7).zip`. Existing PMP exam scoring, attempt storage, answer explanations, settings, permissions, and public/member content were preserved.

## Question import

- The admin's **Download Excel template** action now serves `resources/templates/pmp-question-import.xlsx` using the preexisting `/admin/exam-simulator/pmp/questions/template` route.
- XLSX template columns correspond exactly to `PmpQuestionImporter::HEADERS`. The example row is illustrative and should be replaced before importing real questions.
- Imports are restricted to `.xlsx` and `.csv` in UI, Form Request, and importer. DOCX is no longer supported.
- Existing bounded validation, UTF-8 checks, atomic writes, duplicate-code protection, and question answer-key immutability remain.
- Filename, size limits, selection state, and validation feedback are shown beside the custom accessible picker. It uses PM Circle UI tokens.

## Shared header

- Home is an icon-only link with an accessible name.
- Community is a submenu for **Feed** and **Members**, using existing routes and visibility settings.
- Careers has moved beneath the existing `More PM Circle links` menu alongside Trends. On narrow screens it appears in the expanded mobile menu.
- The mobile menu is no longer fixed at 200px. When expanded, the shared header/shell grows in flow, preserving spacing before page content and allowing menu scrolling for short viewports.
- Shared header, member dashboard and member shell heights follow `--header-height` (currently 5rem desktop / 4rem at <= 880px).

## Verification guidance

Run `php tests/Regression/PmpImportHeaderNavigationStaticCheck.php`, `php artisan test --filter=PmpExamAdminManagementTest`, `npm run types:check`, `npm run build`. Open the public homepage, an authenticated member dashboard, the community feed, and the admin import page at desktop, tablet and mobile widths. Import a copy of the XLSX sample with a unique code, then import a CSV sample, and verify invalid and duplicate-code rows do not partially save.

## Database and deployment

No new migrations or dependencies. Existing migrations must already be applied. Frontend rebuild and Laravel cache clear are required when deploying modified code.
