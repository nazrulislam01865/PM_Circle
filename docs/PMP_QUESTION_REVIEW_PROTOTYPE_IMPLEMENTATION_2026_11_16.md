# PM Circle | PMP Detailed Question Review and Pre-Submission Dialog

Date: 2026-11-16

## Scope and verified implementation

The existing authenticated `GET /exams/pmp/attempts/{attempt}/review` route, member layout, server-scored answers, AI help endpoint, and client exam timer have been preserved. Review page layout and pre-submission dialog now follow the supplied reference screenshots, using the canonical `pm-design-tokens.css` values.

Review page: compact correctness donut and filter list on the left; question number, badges, answer states, four explanation tabs, AI button, and source-backed question metadata on the right. The four tabs are *Explanation*, *Key Takeaway*, *Related Concepts*, and *References*.

Pre-submission dialog: title and running-timer reminder; three counts (answered, unanswered, marked); click-to-return rows for unanswered and flagged questions; Return to Exam and Submit Exam actions. The existing final submission confirmation remains in place and the countdown is never paused by this modal.

The review route still authorizes Plus/Pro members and restricts results to an attempt owned by the authenticated user. This change does not affect grading, billing, AI credit consumption, stored answers, exam timekeeping, site header/footer, or unrelated pages.

## Data mapping

The screenshot shows detailed concepts, reference metadata, domain, difficulty, delivery approach, industry, code, and select type. The existing question schema has free-text columns `other_options`, `takeaway`, `concepts`, and `references`, but no dedicated approach/industry fields. To avoid a migration, the new view supports **optional JSON objects inside those existing columns**, while retaining the previous plain-text rendering. No placeholder PMP citations, page numbers, question industries, or methodology badges are invented when metadata is absent.

`other_options` can retain `A: ... B: ... D: ...` or use:

```json
{"options":{"A":"Reason A is incorrect.","B":"Reason B is incorrect.","D":"Reason D is incorrect."}}
```

`takeaway` can retain a plain sentence or use:

```json
{"summary":"Turn a vague success statement into agreed outcomes.","application":"Agree on the intended success measures before a sponsor decision."}
```

`concepts` can retain semicolon-separated names or use:

```json
{"approach":"Hybrid","industry":"Healthcare","items":[{"title":"Shared outcome","description":"Agree on a result for all stakeholder groups."},{"title":"Success measures","description":"Define how success will be measured."}],"connection":"Shared outcomes define success, and measures reveal progress."}
```

`references` can retain plain citations or use a structured object **only when the question author has verified the references and page numbers**:

```json
{"sources":[{"source":"Source label","title":"Verified publication title","chapter":"Chapter label","section":"Section label","page":"Verified page number"},{"source":"Another source","title":"Publication title","examDomain":"Verified exam domain","task":"Verified task","focus":"Verified task focus","pageLabel":"ECO page","page":"Verified page"}],"performanceDomain":"Verified PMBOK domain","knowledgeArea":"Verified legacy knowledge area"}
```

The question footer uses the database's actual `code`, optional authored `industry`, and the existing single-choice question type. The top badges use actual `domain`, `difficulty`, and optional authored `approach`. For existing questions with only plain text, cards display the supplied text but cannot truthfully display citation-specific details that the admin has not entered.

## Files

| Path | Reason |
| --- | --- |
| `resources/js/pages/exam/Review.tsx` | Prototype review structure, filters, AI handling, question navigation |
| `resources/js/pages/exam/Take.tsx` | Uses dedicated pre-submit review component, keeps timer and submit flow |
| `resources/js/components/exam/PmpReviewExplanation.tsx` | Accessible, four-tab rationale presentation |
| `resources/js/components/exam/pmpReviewContent.ts` | Legacy + optional rich field parsing and metadata mapping |
| `resources/js/components/exam/PmpSubmitReviewSummary.tsx` | Accessible modal summary and question return interactions |
| `resources/js/components/exam/ExamShared.tsx` | Type for server-backed question code |
| `app/Http/Controllers/Exam/PmpExamController.php` | Provides question code from existing database column after completion |
| `resources/css/pm-pmp-review-prototype.css` | Scoped prototype styles using canonical tokens |
| `resources/css/app.css` | Imports new stylesheet |
| `tests/Regression/PmpReviewPrototypeStaticCheck.php` | Static route/design/interaction regression guard |
| `tests/Regression/pmpReviewContent.test.mjs` | Four parser unit tests (legacy, structured, malformed, metadata) |

## Verification performed in archive

- `php -l app/Http/Controllers/Exam/PmpExamController.php`: PASS
- TypeScript/JSX transpile syntax for affected source: PASS
- `node --experimental-strip-types --test tests/Regression/pmpReviewContent.test.mjs`: PASS (4 tests)
- `php tests/Regression/PmpReviewPrototypeStaticCheck.php`: PASS (7 checks)
- `php tests/Regression/ExamResultLayoutImportCheck.php`: PASS (6 checks)
- `php tests/Regression/ExamTimerFooterStaticCheck.php`: PASS (9 checks)
- `node --experimental-strip-types --test tests/Regression/examTimeAndFooter.test.mjs`: PASS (5 tests)
- PostCSS syntax parse for new stylesheet and `app.css`: PASS
- **Full `npm run types:check` / `npm run build`: NOT VERIFIED**. The uploaded archive excludes installed `node_modules`, and dependency installation did not complete in the isolated environment. The included `public/build` is the original build and does not contain these source changes.
- **Laravel feature tests / production screenshot comparison: NOT VERIFIED**. The uploaded archive excludes `vendor` and a configured runtime database/browser session.

## Apply and verify

Use Node 22.18+ (the package-lock dependency tree requires a newer Node 22 release than 22.16). Apply the changed files to a development checkout and run:

```bash
npm ci
npm run types:check
npm run build
php tests/Regression/PmpReviewPrototypeStaticCheck.php
node --experimental-strip-types --test tests/Regression/pmpReviewContent.test.mjs
php tests/Regression/ExamTimerFooterStaticCheck.php
php artisan test --filter=PmpExamAdminManagementTest
php artisan optimize:clear
```

No migration is required. Before deployment, confirm the review screen against the screenshots at desktop (1280px), tablet and small mobile widths, including every tab and empty/flagged filters. Confirm the modal with zero, one and multiple unanswered/flagged questions; test keyboard navigation, disabled links, answer save failures, expired attempts, AI response errors and confirmation.

Deploy only after building assets and testing on staging. Do not modify the content of previously attempted exam questions or overwrite historical answer keys; follow the existing question bank's deactivation/new-code workflow.
