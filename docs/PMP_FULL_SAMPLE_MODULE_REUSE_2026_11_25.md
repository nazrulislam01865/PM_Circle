# PMP public sample — shared full examination presentation

Source: Archive 3(2).zip, 2026-11-25. Existing approved central PM Circle typography and CSS tokens remain the source of truth.

## Implementation

- Both paid `Take.tsx` and `PmpPublicSampleExam.tsx` use `PmpExamTakingView.tsx` for the entire taking canvas: timer header, progress, question, options, strike-through, highlight, mark/review, tools guide, previous/next and navigator. Both use `PmpExamDialogs.tsx` for the same calculator, pre-submit summary and confirmation presentation. The paid controller retains its existing server timer, gating, persistence, retry and submission callbacks. The sample uses local state only.
- Both paid `Review.tsx` and sample `PmpSampleReview.tsx` use `PmpExamReviewView.tsx`: summary donut, filter controls, previous/next, metadata, answer reveal, Explanation, Key Takeaway, Related Concepts and References. The paid caller alone mounts authorized AI chat. The sample reuses the metadata footer without paid AI calls.
- Both paid `Result.tsx` and the sample use `PmpExamResultReport.tsx` for the report. The sample still opens directly in review after completion; its optional View Result Report action uses local answers and current administrator readiness thresholds. The report is educational, never an official certification prediction. It has local review-all, review-missed and retry actions.
- Sample retains its existing administrator-selected question count/order and duration (30–900 seconds), fallback question, scroll-start timer, unrestricted navigation, single-question Check answer, multi-question submission confirmation, timeout review, and local retry. Marked-question navigation and S/H shortcuts are now available in the sample as in the real exam; shortcuts are scoped to the sample and do not capture public-page controls. Closing/finishing an expired sample closes the calculator. No paid attempt or credit is created. No new route, migration, or dependency.
- `PmpPublicPageController.php` sends metadata only for the already selected active sample questions and three existing threshold values from the settings read already performed. `Public.tsx` and `PmpPublicSections.tsx` pass these through. No additional DB query or settings change.
- Public page chrome and current public section visibility remain unchanged. The embedded sample shares the real simulator typography and card/dialog CSS. Public landing h2/h3 rules no longer override embedded headings, and container-based reflow adapts the same components to narrow embedding widths.
- The member dashboard (Overview/Performance/History/AI Usage), subscription/AI billing, member-only mock/focused start selection and paid AI calls remain account-only. They cannot be populated meaningfully by the current local sample workflow. The existing scroll-start behavior is unchanged; no member start dialog has been inserted in front of it.

## Verification

- Baseline: Node 22.16.0 with `--experimental-strip-types`, 381/382 regression tests pass; one pre-existing failure in `pmpWorkbookAndDashboard.test.mjs` expects `<strong>AI Tokens</strong>` while the current workspace uses an updated heading. Updated project: 382/383 pass, same unrelated failure. Four new/updated shared sample checks pass. No unrelated source was changed.
- Five dependency-free PHP exam checks pass (34 assertions: sample, review, single panel, timer, result); corrected stale result check to use existing approved compact title token. PHP syntax checks for changed controller and feature tests pass. 27 exam TSX files transpile with no syntax errors; CSS parses successfully.
- Added Laravel feature assertions for sample metadata, admin thresholds and zero paid attempts. Not executed: no vendor dependencies/database environment.
- The input archive's compiled review asset check already fails. Updated build check follows shared static manifest dependencies. A fresh build is required before running it. The full source delivery deliberately omits stale public/build; the patch does not replace public/build. npm ci --offline failed (yuku-parser not cached), and Node 22.16.0 is below Vite Plus's requirement. Full type-check, Vite build, live Laravel/browser visual and interaction checks remain unverified.

## Apply and verify

From existing project root, overlay changed files (no deletion), then with supported Node 22.18+:

```sh
npm ci
npm run types:check
npm run build
php artisan optimize:clear
php artisan test --filter=PmpExamAdminManagementTest
node --experimental-strip-types --test tests/Regression/pmpPublicSampleRealExamReuse.test.mjs
php tests/Regression/PmpReviewBuildSyncCheck.php
```

Use a guest/private window at `/exam-simulator/pmp/details`. Test one and multiple configured sample questions, timer expiration with dialog open, answer/strike/highlight, flagged navigation, calculator, summary/confirmation, review filters, all four explanation tabs, result report, and local retry. Verify on desktop, tablet and mobile. In a paid member session separately verify server-backed answers, gating, timer, submit, review, and AI chat. Do not deploy old compiled assets; rebuild before deploying.
