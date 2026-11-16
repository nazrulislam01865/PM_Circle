# PM Circle — PMP Question Bank Workbook and Dashboard Update

## Scope

This update aligns the PMP administrator's question editor and downloadable `.xlsx` template with the 30-column `PM_Circle_PMP_Question_Bank.xlsx` supplied for this change. It corrects the Mock Exams card to distinguish full mocks from focused practice and restores the member's real AI token usage to the Overview card. Other exam-scoring, AI-authorisation, subscription and question-attempt workflows are unchanged.

## Supported workbook

Download **PMP Exam Management → Question bank and import → Download Excel template**. The workbook retains three worksheets: **Question Bank** (imported), **Coverage** (editorial planning only) and **Field Guide** (explanations). The Question Bank sheet has exactly these 30 headers:

1. Question ID
2. Exam Domain
3. ECO Task ID
4. ECO Task Focus
5. Difficulty
6. Approach
7. Question
8. Option A
9. Option B
10. Option C
11. Option D
12. Correct Option
13. Correct Answer
14. Why Correct
15. Rationale A
16. Rationale B
17. Rationale C
18. Rationale D
19. Key Takeaway
20. Related Concepts
21. PMBOK 8 Performance Domain
22. Legacy Knowledge Area
23. Industry
24. Question Type
25. Reference Publication
26. Reference Section
27. Reference Heading
28. Reference PDF Page
29. ECO Reference
30. Review Status

The `Correct Answer` cell must match the text in the option selected by `Correct Option`. In the manual editor, Correct Answer is derived automatically and read-only. The content is stored under the existing question model: Question ID maps to `code`, Question to `prompt`, Why Correct to `explanation`, and the four option rationales are stored as JSON. References, performance domain and knowledge area remain distinct fields and are also formatted for the existing review-tab renderer. `Related Concepts` can use semicolon-separated tags.

Only `Single Select` is currently supported. The supplied workbook contains 100 single-select questions and they are all marked **Editorial draft**. Workbook imports always create **inactive** questions, even if a row is marked Approved: an administrator must deliberately approve and activate them. The existing 15-column CSV format remains accepted for backward compatibility. Duplicate question IDs, an invalid answer key, a mismatched Correct Answer, an unsupported question type, invalid review status, formula cells, or an invalid row fail the entire import transaction. Existing attempted question content is immutable.

## Mock Exams summary

- The card's completed and in-progress counts include `full` attempts and legacy attempts with no mode. Focused-practice attempts are counted separately to avoid overstating mock exams.
- Latest score is the percentage of correct answers in the most recently completed **full mock**, sourced from its saved deterministic `correct_count`. A genuine 0% score remains 0%; no score is invented.
- Expired, unsubmitted attempts are not reported as actively in progress. Scores only change when attempts are finished through the normal exam workflow.
- The dashboard refreshes a browser back-forward-cached snapshot when restored, without continuously polling.

## AI card

The Overview card displays **AI Tokens**, **used** and **remaining** numbers from the same member-scoped `PmpAiUsageReadModel` used by the detailed **AI Usage** tab. It includes a View AI Usage button. This does not create or modify token allocations, change OpenAI pricing, or expose private member transcripts.

## Modified files

- `database/migrations/2026_11_16_050000_extend_pmp_question_bank_source_fields.php` — additive metadata and mock-summary index
- `app/Services/Exam/PmpQuestionContent.php` — canonical metadata and review-field mapping
- `app/Services/Exam/PmpQuestionImporter.php` — 30-column importer plus legacy CSV compatibility and full-batch validation
- `app/Http/Requests/Admin/SavePmpExamQuestionRequest.php` — server validation of new fields
- `app/Http/Controllers/Admin/PmpExamBankController.php` — metadata CRUD, review gate, review filter
- `resources/js/pages/admin/PmpQuestionBank.tsx` — workbook-aligned editor and bank UI
- `resources/templates/pmp-question-import.xlsx` — official 30-column download template
- `app/Http/Controllers/Exam/PmpExamController.php` — full-only mock totals and source metadata on review
- `resources/js/pages/exam/Index.tsx` — Overview usage card data and bfcache refresh
- `resources/js/components/exam/PmpWorkspacePanels.tsx` — corrected Mock Exams and AI Tokens cards
- `resources/js/components/exam/ExamShared.tsx`, `pmpReviewContent.ts`, `PmpReviewExplanation.tsx` — display imported metadata on existing tabs
- `resources/css/pm-admin.css` — editor section styles using existing tokens
- `tests/Feature/Exam/PmpExamAdminManagementTest.php` — workbook import, draft protection, atomic failure
- `tests/Feature/Exam/PmpDashboardSummaryTest.php` — full-versus-focused exam counts and latest full score

## Local deployment and validation

1. Back up your local database, apply changed files and ensure Laravel runtime directories exist.
2. Run `php artisan migrate` to create the new optional columns. **Do not run `migrate:fresh` or `db:wipe`.**
3. Run `php artisan optimize:clear`.
4. Run `php artisan test --filter=PmpExamAdminManagementTest`.
5. Run `php artisan test --filter=PmpDashboardSummaryTest`.
6. Run `php artisan test --filter=PmpPersonalDashboardTest`.
7. Run `php artisan test --filter=AiGatewayIntegrityTest`.
8. Run `npm run types:check && npm run build`.
9. In the administrator question bank, download the new template, fill it, and upload `.xlsx` or `.csv` (maximum 1,000 questions / 5MB). The supplied 100-question workbook can be uploaded directly. Review draft questions, set their status to **Approved**, then activate them.
10. Using an eligible member account, complete a full mock and a focused-practice attempt. Confirm that the Mock Exams card counts the full mock and shows its latest score; confirm the AI Tokens card matches the AI Usage tab.

No production data was modified in the delivery environment. Source and static checks are listed in the accompanying response. End-to-end Laravel tests must run against your configured application and database before release.
