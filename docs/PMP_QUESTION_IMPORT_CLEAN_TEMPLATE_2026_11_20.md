# PMP Question Import — Clean Template and Immediate Activation (2026-11-20)

## Scope

Only the PMP admin question-import flow and its downloadable Excel template were changed. No exam runtime logic, existing records, or database schema is modified.

## Downloadable workbook

- `resources/templates/pmp-question-import.xlsx` now contains a single `Question Bank` worksheet with **the exact same 30 header names in the exact same order** as the user-supplied workbook, and zero sample question rows.
- Header styling, source column widths, and the header row remain. Freeze panes are moved to `A2`; a header filter and dropdown validation for Exam Domain, Difficulty, Approach, Correct Option, Question Type, and Review Status help prevent entry errors.
- The unrelated Coverage/Field Guide worksheets were removed from the *blank template*, not from the original test workbook.
- `tests/Fixtures/pmp-question-bank-original.xlsx` retains the unchanged 100-question source workbook for all-column regression coverage. It is not the downloadable template.

## Admin import and publication

- Existing admin import endpoint and authorization remain unchanged: `POST /admin/exam-simulator/pmp/questions/import`, restricted by `auth`, `pm.admin`, verified email, and throttling.
- Optional validated `activate_all` flag defaults to false. **Unchecked:** existing source Review Status and existing publication rules apply; editorial drafts remain inactive. **Checked:** every successfully imported question is saved with `review_status = Approved` and `is_active = true`, including rows originally marked Editorial draft.
- All *other* 29 source fields remain mapped into the existing database columns (including `correct_answer_text` and option rationales), as they were before this change. The Review Status field is intentionally overridden only when instant activation is requested.
- Existing code uniqueness checks, row validation, answer matching, all-or-nothing transactions, 1,000-question file limit, and non-overwriting policy remain in force. This flag affects **only newly imported questions**.
- No background jobs, migrations, new queries, or new routes were added.

## Import progress

- The admin form displays actual browser-to-server upload percentage reported by Inertia's upload progress callback.
- After upload reaches 100%, the interface displays an **indeterminate** progress bar for server-side validation and atomic saving. The UI does not invent a per-question percentage, since the endpoint is synchronous.
- The UI shows complete only when the server succeeds; on validation failures, it shows a failure state with the existing server error message.

## Verification and deployment

- Verified source and blank-template headers match on all 30 columns; zero question records in the download. Original workbook still holds 100 questions.
- PHP syntax for changed request, controller, importer and feature tests is valid.
- Focused JS regression tests and updated PHP import static check passed; the broader regression suite had unrelated pre-existing missing-archive-file and static-test failures.
- Full Laravel integration and frontend build could not be completed in the supplied archive/environment (Composer dependencies and PHP zip/DOM/PDO drivers unavailable; npm dependency install timed out and Node 22.16.0 is below current Vite requirements).

On a properly configured local environment, run:

```sh
composer install
php artisan migrate:status
php artisan test --filter=PmpExamAdminManagementTest
php tests/Regression/PmpImportHeaderNavigationStaticCheck.php
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

**No new migration is required.** Deploy changed PHP/React/CSS/template files together, then rebuild the frontend bundle. Preserve the production `.env`, database, storage uploads, and running examination attempts. **Do not import the original 100-question fixture into an existing populated bank**: duplicate IDs are rejected, as designed.
