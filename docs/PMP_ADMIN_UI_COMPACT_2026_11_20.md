# PM Circle — PMP administration interface alignment

Date: 2026-11-20

## Scope

Only the PMP questions & settings page (`resources/js/pages/admin/PmpQuestionBank.tsx`) and its scoped admin CSS (`resources/css/pm-admin.css`) were adjusted. An existing static regression check was updated and a new focused regression check was added.

## UI changes

- Retained the existing admin layout, sidebar, page header, typography, colors, controls, and design tokens.
- On the **Exam settings** tab, Full mock and Focused practice use balanced side-by-side cards on desktop; Sample/performance occupies a full-width compact card. They stack responsively on narrow screens.
- Moved both existing exam-option checkboxes into one compact row; save button now uses the established regular button width rather than stretching across the whole form.
- In the **Question bank and import** tab, removed the three requested redundant explanatory messages under instant activation, under the file picker, and at the bottom of the import panel.
- The file field still exposes a field-specific error for invalid submissions; removed an unused description reference from its accessible attributes.
- Preserved other existing help text and field labels, the original 30-column template, import limits, progress UI, and the instant activation checkbox.

## Behavior and data

No changes to controllers, services, routes, database schema, exam timers, question selection, imports, scoring, authorization, or exam rules. No migrations or database queries were added.

## Verification in the supplied source

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: **101 tests passed, 0 failed**.
- `php tests/Regression/PmpImportHeaderNavigationStaticCheck.php`: **passed**.
- `php tests/Regression/PmpDynamicAdminStaticCheck.php`: **passed**.
- TypeScript TSX transpile/syntax check on updated page: **passed**.
- CSS syntax parser check: **passed**.
- Full `npm run types:check`, `npm run build`, and Laravel database feature tests: **not executed** (project package does not include the necessary Composer/Node dependencies).

## Deployment note

Install dependencies using the project's actual lockfiles, run `npm run types:check` and `npm run build`, and clear cached Laravel views/config as appropriate. Preserve production `.env` and storage. No migration or queue restart is required for these UI-only changes.
