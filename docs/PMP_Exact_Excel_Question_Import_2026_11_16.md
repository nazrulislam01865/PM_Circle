# PM Circle PMP — Exact Excel Template and 30-Column Persistence

> **2026-11-20 change:** This file documents the previous source-workbook download behavior. The admin download is now a clean, header-only 30-column template; the original 100-row workbook is retained only as `tests/Fixtures/pmp-question-bank-original.xlsx` for regression testing. See `docs/PMP_QUESTION_IMPORT_CLEAN_TEMPLATE_2026_11_20.md`.


## Source of truth

- Original user-supplied workbook: `PM_Circle_PMP_Question_Bank(1).xlsx`
- Included application download asset: `resources/templates/pmp-question-import.xlsx`
- Admin download name: `PM_Circle_PMP_Question_Bank.xlsx`
- SHA-256 (both source and app asset): `7f731a5539ed8e66f9d662b9e384847b0901ed913953be013e7ca3101a4d02ca`
- Preserved **without modification**: all 30 Question Bank columns (A–AD), 100 original question records, Coverage worksheet including formulas, Field Guide worksheet, Excel tables and formatting.
- Imported to database: all **Question Bank** rows and columns. Coverage and Field Guide remain part of the exact downloadable workbook; they are metadata/calculations, **not additional question records**.

## Source column → permanent database field

| # | Workbook column | Column heading | Storage field |
|---:|:---:|---|---|
| 1 | A | Question ID | `code` |
| 2 | B | Exam Domain | `domain` |
| 3 | C | ECO Task ID | `eco_task_id` |
| 4 | D | ECO Task Focus | `eco_task_focus` |
| 5 | E | Difficulty | `difficulty` |
| 6 | F | Approach | `approach` |
| 7 | G | Question | `prompt` |
| 8 | H | Option A | `options.A` (JSON) |
| 9 | I | Option B | `options.B` (JSON) |
| 10 | J | Option C | `options.C` (JSON) |
| 11 | K | Option D | `options.D` (JSON) |
| 12 | L | Correct Option | `correct_option` |
| 13 | M | Correct Answer | **`correct_answer_text` (new DB field)** |
| 14 | N | Why Correct | `explanation` |
| 15 | O | Rationale A | `option_rationales.A` (JSON) |
| 16 | P | Rationale B | `option_rationales.B` (JSON) |
| 17 | Q | Rationale C | `option_rationales.C` (JSON) |
| 18 | R | Rationale D | `option_rationales.D` (JSON) |
| 19 | S | Key Takeaway | `takeaway` |
| 20 | T | Related Concepts | `concepts` |
| 21 | U | PMBOK 8 Performance Domain | `pmbok_performance_domain` |
| 22 | V | Legacy Knowledge Area | `legacy_knowledge_area` |
| 23 | W | Industry | `industry` |
| 24 | X | Question Type | `question_type` |
| 25 | Y | Reference Publication | `reference_publication` |
| 26 | Z | Reference Section | `reference_section` |
| 27 | AA | Reference Heading | `reference_heading` |
| 28 | AB | Reference PDF Page | `reference_pdf_page` (integer) |
| 29 | AC | ECO Reference | `eco_reference` |
| 30 | AD | Review Status | `review_status` |

## Validation and safety

- Only the `Question Bank` worksheet is parsed for questions. Other sheets are preserved unmodified in the downloadable workbook.
- Exactly the 30 source headers, in the original order, are required for the official import. Unknown, missing, reordered, and renamed columns are rejected rather than silently discarded. Legacy CSV imports remain available separately.
- The correct option letter and exact Correct Answer source text are persisted independently, and their content must agree.
- Import is atomic: invalid rows prevent all inserts. Question IDs are unique and existing/attempted questions cannot be overwritten.
- `Editorial draft` questions are imported **inactive**. Admin review and approval are required to activate them. No exam scoring or AI functionality is changed.
- Original Excel file has 100 records, all classified `Editorial draft`. If those Question IDs have already been imported, another upload will be rejected as a duplicate; no destructive changes are made.
- Formula cells on the Question Bank worksheet are rejected. The Coverage formulas are left intact because that sheet is not imported as questions.
- For manual question create/edit, Correct Answer is displayed as the selected option text and persisted in the dedicated database column, avoiding contradictory answer keys.

## Database deployment

1. Back up your application database before any deployment.
2. Apply the **additive** migration: `2026_11_16_060000_preserve_pmp_correct_answer_text.php`. It adds the column and backfills existing rows from their saved correct option without deleting or rescoring exam data.
3. `php artisan migrate`
4. `php artisan optimize:clear`
5. `php artisan test --filter=PmpExamAdminManagementTest`
6. `node --experimental-strip-types --test tests/Regression/pmpWorkbookAndDashboard.test.mjs`
7. `npm run types:check && npm run build`
8. From the administrator Question Bank page, download the template and verify it is your original file (same three sheets and 30 columns). Upload it once and review imported drafts.

## Verification completed in packaging environment

- Exact asset SHA-256 matches uploaded workbook; sheet names, 30 headers, 100 source rows and 100 Correct Answer-to-option matches validated with openpyxl.
- 31 JavaScript regression tests pass; relevant PHP static import/header check passes; updated PHP files pass syntax checks; TSX syntax parser reports no errors.
- The full Laravel integration suite and actual database write/read-back tests **could not run here** because the provided archive lacks Composer dependencies, and the available PHP runtime lacks PDO database drivers and DOM/ZIP extensions. The new feature test checks all 3,000 source cells against the stored database fields when run in your Mac environment.

No production database changes have been performed.
