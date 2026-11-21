# PMP public sample exam: searchable multi-question selector

Source baseline: `PM_Circle_PMP_Sample_Question_Selector_Review_Summary_20261121.zip` (the most recent previously delivered sample selector package).

## Requirement and root cause
The old administrator question search rendered a long, overlapping single-select list and saved only `sample_question_id`. The guest sample exam rendered exactly one question. Supporting multiple selected bank questions therefore required a persistent ordered selection and a multi-question preview, not only replacing the input control.

## Implemented
- Replaced the old dropdown with a focused, keyboard-accessible search dialog. Supports code/ID/keyword search, domain filter, first 20 matching active results, checkbox selection, bulk add of visible results, and clear all.
- Displays the selected question previews, numbered exam order, remove and reorder controls on the main admin form. Up to 20 unique active questions can be selected. **Save exam settings** persists the changes.
- `pmp_exam_settings.sample_question_ids` JSONB keeps selected IDs in administrator-defined order. Existing `sample_question_id` continues to mirror the first question so older clients and existing behavior remain supported. Existing selections are backfilled by the additive migration.
- The guest `/exam-simulator/pmp` page queries only selected active question-bank records, preserving saved order. If there are no valid active selected questions, the existing built-in sample is used.
- Public sample retains the current question/option/explanation display and timer, and now includes Previous, Next, clickable question navigator, per-question answers/marks/strike-through/highlights, Finish & Review, summary, explanations, and Try again. The configured duration is **total sample exam time**, not time per question. Guest attempts are local preview state and do not change paid exam attempts/scoring.
- The Review Summary design for the paid exam is unchanged from the previously approved screenshot implementation.

## Files affected
- `database/migrations/2026_11_21_230000_add_public_sample_question_ids_to_pmp_exam_settings.php`: additive JSONB migration and legacy backfill.
- `app/Services/Exam/PmpExamSettings.php`: read/write ordered list, synchronize legacy field.
- `app/Http/Requests/Admin/UpdatePmpExamSettingsRequest.php`: bounded, active-only, unique ID validation.
- `app/Http/Controllers/Admin/PmpExamBankController.php`: return selected previews and searchable filtered candidates.
- `app/Http/Controllers/PublicSite/PmpPublicPageController.php`: fetch ordered active public samples.
- `resources/js/components/admin/PmpSampleQuestionSelect.tsx`: focused multi-select user interface.
- `resources/js/pages/admin/PmpQuestionBank.tsx`: setting field wiring and inline errors.
- `resources/js/pages/exam/Public.tsx`, `resources/js/components/exam/PmpPublicSections.tsx`, `resources/js/components/exam/PmpPublicSampleExam.tsx`: multiple question props and guest navigation/review.
- `resources/css/pm-admin.css`, `resources/css/pm-exam-simulator.css`: scoped styling and mobile behavior.
- `tests/Feature/Exam/PmpExamAdminManagementTest.php`, `tests/Regression/PmpSampleSelectorReviewSummaryStaticCheck.php`, `tests/Regression/PmpPublicMultiSampleStaticCheck.php`: behavior/contract coverage.

## Verification
- PHP syntax validation passed for changed PHP files.
- TypeScript/TSX transpilation syntax diagnostics passed for changed components/pages.
- Both modified CSS files parsed without top-level CSS errors.
- Targeted static checks passed.
- `node --test tests/Regression/*.test.mjs`: **151 passed, 4 failed**. All four failures are also present in the unchanged baseline archive (`examTimeAndFooter`, `homepageFullControl`, `memberNavigation`, `pmpReviewContent`).
- PHP static regression scripts have six unrelated pre-existing failures in the baseline; the two selector-specific suites pass.
- Feature tests and the full production asset build **could not be executed** in this environment because Composer vendor dependencies and npm dependencies are not installed. Browser interaction was not verified. Do not claim production readiness until those are run.

## Deployment and rollback precautions
Back up the database and application before applying the new migration. Do **not** deploy only the frontend; the backend and schema change together.

```bash
composer install --no-interaction --prefer-dist --optimize-autoloader
php artisan migrate --force
npm ci
php artisan wayfinder:generate --skip-database --with-form
npm run types:check
npm run build
php artisan optimize:clear
php artisan test --filter=PmpExamAdminManagementTest
```

Use a project-compatible Node 22.18+ or 24.x version. Rebuild `public/build` in the intended deployment environment (not bundled in the source ZIP). No destructive migration or production deployment was performed here.
