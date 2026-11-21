# Interview Preparation — Central Master Data, Import and Safe Delete

## Scope

- Interview industry, role, experience, type, count and answer-mode choices are now stored in `master_data_options`, under `interview_*` categories and available from **Admin → Master Data**. The earlier `interview_catalog_options` rows are copied in the new migration; the legacy table is retained untouched for non-destructive transition. Interview Preparation's Member options tab edits that same central table.
- Interview admin selects now use the reusable `AdminChoice` (Radix) dropdown with the existing Rajdhani font and shared design tokens. Optional question-set match fields can be cleared.
- Question Bank → Import questions accepts a CSV or XLSX uploaded to a selected existing question set. Download the 4-column CSV template directly from the Import dialog. Columns: `Question Type`, `Interview Question`, `Active` (`Yes` or `No`), `Display Order` (0–65535). First sheet for XLSX. UTF-8; 1–500 questions; max 5MB. Supported types come from active Interview question types in Master Data. All rows are validated before one atomic insert; duplicate existing/new questions are rejected. No formulas/macros are evaluated.
- Delete confirmation is available for Interview member options, question sets and individual questions. Referenced question types and set filters cannot be removed. Question sets containing questions must be emptied first, and every option group must retain one active value. Question snapshots in started sessions are preserved.
- No new background jobs, external dependencies or AI calls.

## Database and rollout

- Run migration `2026_11_21_000002_move_interview_options_to_master_data` after the existing Interview admin catalog migration; it copies existing customized values safely, never drops a table.
- Backup PostgreSQL before deploying migrations; build frontend assets from updated source; clear application caches.
- The migration retains the earlier `interview_catalog_options` table as inactive legacy data. Do not roll back/delete that table without separately reviewing any historic customizations.

## Verification

- Laravel feature tests: `php artisan test --filter=InterviewAdminCatalogTest` (requires PHP drivers, Composer dependencies and test DB).
- Static regression: `node --test tests/Regression/interviewAdminCatalog.test.mjs`.
- Test the admin dialog, import valid and invalid CSV/XLSX, reject deleting referenced sets/types, verify Master Data edits appear in the member form, and confirm historic session snapshots do not change.
