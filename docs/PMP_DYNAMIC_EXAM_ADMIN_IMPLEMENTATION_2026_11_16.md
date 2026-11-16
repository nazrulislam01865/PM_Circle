# PM Circle | Dynamic PMP exam management

## Verified project baseline

The uploaded project already has `pmp_exam_questions`, `pmp_exam_attempts`, and `pmp_exam_attempt_answers`, plus member routes for starting, answering, submitting, viewing results, reviewing, history, and post-exam AI help. Its administration uses the existing Inertia/React `AdminLayout` with an admin-only route group. This implementation extends those systems; it does not introduce another exam engine, replace the scoring algorithm, or add a second administration framework.

## Admin entry point

`/admin/exam-simulator/pmp/questions` (visible in the shared admin navigation as **PMP questions & settings**). The existing **PMP public page** content editor remains separate.

**Settings (applies to future attempts):** enabled/disabled, full-mock question count and allowed minutes, focused-practice question count and allowed minutes, randomized question selection, three educational readiness thresholds, public sample question ID, and public sample duration. Settings default to the previous behavior when no row is stored. Attempts persist the selected question IDs, mode, rules snapshot and original deadline. The result screen uses each attempt's historical thresholds, not live administrator settings.

**Question management:** paginated searchable question bank; create, edit, activate/deactivate; domain and difficulty; A-D answer options; correct option; optional explanation, incorrect-option notes, takeaway, concepts and references. Deactivation only excludes a question from new attempts; historic results and reviews still work. A question used in any attempt cannot be edited; deactivate it and add a different question code for a corrected version. Questions are never hard-deleted through this interface.

## Import template

Click **Download template** in the admin editor to obtain a CSV with these 15 headers:

`code,domain,difficulty,question,option_a,option_b,option_c,option_d,correct,explanation,other_options,takeaway,concepts,references,active`

- Upload **CSV UTF-8**, **XLSX** (first worksheet), or **DOCX** (first table, heading row first). These are modern Excel/Word formats, not legacy binary `.xls`/`.doc`. Convert old files to `.xlsx`/`.docx` before import.
- You may open the CSV template in Excel, fill the rows, then **Save As XLSX**. For Word, create a table using the same first-row headings and one question per subsequent row, then save as DOCX.
- Required: domain (`People`, `Process`, or `Business Environment`), question, option A/B/C/D, correct (`A`, `B`, `C`, or `D`). Difficulty defaults to `Moderate` (`Easy`, `Moderate`, `Hard` accepted). Explanation and supporting notes are optional.
- Unique code is recommended. If blank, a stable `pmp-...` code is generated from the question text. Codes must be ASCII letters, digits, `_`, or `-` (up to 70 chars). Repeated codes within the file, or codes already in the database, reject the entire upload.
- `active`: `yes/no`, `true/false`, or `1/0`. **Blank defaults to inactive**, so imported content can be reviewed before publication.
- Maximum **1,000 rows / 5 MiB** per upload. Laravel validates MIME and file size; the ZIP parser caps XML entry size at 8 MiB. Uploaded data is never executed as macros or scripts. The PHP **zip** and **DOM** extensions must be enabled for XLSX/DOCX.
- Every row is validated before insertion; invalid rows cause the **entire import to fail**, with row-numbered errors. Inserts are wrapped in one DB transaction and batched in groups of 200. No partial success or silent overwrites.

## Member runtime behavior

- Plus/Pro eligibility and backend authorization remain unchanged.
- Full practice selects up to the configured active question count. If the bank is smaller, the full exam uses all available questions and scales the allowed duration proportionally (minimum 10 minutes), to preserve the existing small-demo behavior. Focused practice uses the configured count and minutes in the selected PMP domain.
- New attempts use bounded indexed reads; randomized selection rotates the starting range and shuffles the selected IDs without sorting the whole database using `ORDER BY RANDOM()`.
- The existing `/exams/pmp/attempts/{id}` page still receives **no answer keys** during an active exam. Answers/explanations are sent only to the existing review page after completion.
- The server is authoritative for answer saving, deadlines and scoring. Changing a question's active state or the live settings does **not** alter ongoing attempts or past scores.
- For the public sample, the admin can set an active question ID; it is deliberately exposed as one practice example, including its explanation. If unset or inactive, the existing static sample remains as fallback. The sample seconds are configurable.
- The existing result page labels are educational practice bands, **not official PMI ratings**.

## File changes and database impact

- One additive migration `2026_11_16_000004_create_pmp_exam_settings.php` creates one-row `pmp_exam_settings`, adds nullable `mode` and `rules_snapshot` to existing attempts, and adds a composite question-domain index. No existing answers, question IDs, or scores are rewritten.
- Backend: `PmpExamSettings`, `PmpQuestionImporter`, `PmpExamBankController`, three Form Requests; existing member and public PMP controllers; routes and admin-only middleware.
- Frontend: `PmpQuestionBank`, shared admin navigation/CSS, existing member dashboard, result page, and public sample. Existing UI tokens remain the design source.
- Tests: `PmpExamAdminManagementTest` and `PmpDynamicAdminStaticCheck`, plus updated old source checks for configurable sample time/results.

## Local validation commands

Before migrating, back up the intended database and inspect `.env`. On macOS Homebrew PHP 8.4, invoke `php`, **not** `php8.4` or XAMPP's older PHP.

```bash
php -m | grep -E 'zip|dom|libxml'
php artisan migrate:status
php artisan migrate
php tests/Regression/PmpDynamicAdminStaticCheck.php
php tests/Regression/ExamTimerFooterStaticCheck.php
php tests/Regression/ExamResultLayoutImportCheck.php
php artisan test --filter=PmpExamAdminManagementTest
php artisan test --filter=PmpPersonalDashboardTest
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Use **Node >=22.18**. This archive contains source, not a built/tested production release. A locally successful build and real PostgreSQL test of XLSX/DOCX imports are still required. Do not run `migrate:fresh` or any destructive database operation on production.

## Release checks

1. Upload a small CSV/XLSX/DOCX and verify options, correct answer, explanation, and active/inactive status.
2. Reject a file with one invalid answer, duplicate code, or unauthenticated request; verify no rows were inserted.
3. Configure 3 questions and a 24-minute mock, start, refresh, save answers and complete; verify the same deadline and server-side score.
4. Change settings to 45 minutes while the exam is open; the existing attempt must still have 24 minutes originally assigned.
5. Edit an unused question, then attempt to edit its answer key after it has been used; the second edit must fail. Deactivation must not remove historical review content.
6. Verify guest public sample, member result/review UI, and admin responsive layout against approved screenshots. These interactive checks were not executable in the current build environment.
