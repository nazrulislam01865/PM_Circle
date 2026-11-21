# PM Circle Interview Question Import — compact dialog UX (21 November 2026)

Scope: `/admin/interview-preparation`, Question bank > Import questions.

## Changed

- Replaced the browser-native upload control with a labeled, keyboard-accessible file picker and drop target.
- Added a selected-file summary (name, size, replace/remove), clear inline errors for invalid extension, empty files, and >5 MB files.
- Grouped the workflow into **Choose a question set** and **Upload your questions**, with the existing CSV template link and concise rules below.
- Used only centralized color, spacing, sizing, and Rajdhani `--font-ui` tokens; adjusted layout for narrow screens.

## Not changed

- Backend import endpoint, CSRF/auth, validation, parser, destination set selection, 500-row limit, template columns, Master Data question types, and non-overwrite behavior.
- Database tables, migrations, existing interviews, and unrelated admin pages.

## Verification

- Node focused regression tests: `tests/Regression/interviewImportUX.test.mjs`, `interviewDropdownModalLayer.test.mjs`, and `interviewAdminCatalog.test.mjs`.
- TypeScript TSX transpilation with installed TypeScript compiler succeeded.
- Chromium static CSS fixture at 360, 390, 768, 1440px: no horizontal overflow; dialog remains visible, with internal scrolling on short screens.
- Full live Laravel/Inertia end-to-end testing and production asset build not run in the packaging environment.

## Deployment

- Rebuild frontend with the installed project's supported Node/npm environment (`npm ci && npm run build`).
- Use `php artisan optimize:clear` if necessary. No migrations are required for this UI change.
