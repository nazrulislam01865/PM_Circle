# Public PMP sample — real exam workspace reuse

Date: 2026-11-23

## Scope and design source

Requested change: make the public PMP sample section match the actual timed PMP exam and completed-question review screens. The source is the existing `Archive 4.zip` implementation and approved PM Circle centralized CSS design variables. Do not change the public catalog, profile reward, shared layout, subscription entitlement, exam scoring, admin sample selection, or paid attempt API.

## Source changes

- `resources/js/components/exam/PmpExamQuestionChrome.tsx` — shared real/sample question header and exam tool toolbar; callbacks retain the controlling parent state.
- `resources/js/components/exam/PmpExamNavigator.tsx` — shared five-column navigator, 20-question pagination, progress counters, answer/current/marked states, and marked/summary actions.
- `resources/js/pages/exam/Take.tsx` — consumes the shared components; retains server-synchronized timer, question gating, persistence, retry behavior, server submission and expiry redirect.
- `resources/js/components/exam/PmpPublicSampleExam.tsx` — uses the same question workspace styles, tool guide, option renderer, progress, and pre-submit review dialog with **only local state**, no paid attempt or network endpoint. Single-question Check answer stays immediate; multi-question completion follows the real review-before-submit dialog and locally confirms.
- `resources/js/components/exam/PmpSampleReview.tsx` — uses the real review-page structural classes, `ExamStatus` donut/counters, four filters, `ExamOptionList` read-only answer reveal, and `PmpReviewExplanation` tabs. Shows `Try again` to restart the local attempt.
- `resources/css/pm-pmp-public.css` — only sample-frame and embedded review-spacing rules, using centralized token variables. Real exam and review CSS remain the owners of their layouts.
- `tests/Regression/PmpPublicMultiSampleStaticCheck.php`, `tests/Regression/pmpAdminControlledExamAndLayout.test.mjs`, `tests/Regression/pmpPublicSampleRealExamReuse.test.mjs` — updated and added source-contract regression checks.

## Backend and security

No PHP routes/controllers, database schema, queries, authorization rules or AI services were changed. Admin-selected active sample questions and timer configuration continue to arrive through the existing controller. Local-only answers are not persisted and do not consume AI credits. Authenticated paid attempts continue to use the existing server-side scoring and answer API. The public sample explains educational feedback only; it is not a certification result.

## Verification status

- Node regression suite: 184 passing, 1 pre-existing failure in `activityLogUiGuideline.test.mjs` due to `PM_Circle_UI_Style_Guide (4)(8).html` missing at project root of the supplied archive; no Activity Log source was changed.
- PMP multi-sample, review prototype, review panel, review summary and timer static checks: PASS.
- Changed TSX parser/transpilation and CSS parsing: PASS.
- Full project TypeScript and Vite build: not verified, because this environment lacks a completed npm dependency installation and uses Node 22.16.0, below the project's required toolchain. Use Node >=22.18 for the local rebuild.
- Rendered browser comparison: not verified; Chromium headless timed out in this environment.

## Local verification

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Visit `/exam-simulator/pmp/details` and test the sample: navigate/answer/flag, strike through/highlight/calculator, single-check or multi-submission, review summary and filters, explanation tabs, and Try again. Inspect desktop, tablet and mobile widths. This release contains source files rather than old `public/build` assets.
