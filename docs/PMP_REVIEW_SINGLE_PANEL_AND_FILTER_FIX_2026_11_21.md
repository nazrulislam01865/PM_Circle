# PMP exam review — single explanation panel and filter correction

## Diagnosis

The supplied screen shows one exam question with four repeated "Explanation / Key Takeaway / Related Concepts / References" bars and repeated "Why D is correct" messages. That is a presentation problem, not multiple correct keys: `pmp_exam_questions.correct_option` is a single answer key, returned by `PmpExamController::questions()` as `correct`, and `ExamOptionList` highlights a choice only when its key equals that answer key.

The uploaded source already called one `PmpReviewExplanation` component per selected question; the screenshot's stacking could not be reproduced from this source alone, which makes a stale/mismatched frontend build or a client-side re-render problem plausible. No database access or running user session was available to prove which was responsible.

A separate confirmed defect was identified: the `Missed` filter included unanswered questions, leading to inflated counts (for example, all 108 unanswered questions could be shown as "Missed").

## Minimal implementation

- `PmpReviewExplanation.tsx`: renders exactly one explanation section and one active tab panel, choosing one of the four authored sections with an exclusive switch. All existing detailed fields (wrong-option rationales, takeaway/application, concepts, structured references and metadata) are retained; unprovided source details remain empty instead of fabricated.
- `Review.tsx`: keys the *whole question card* by question ID so navigation replaces its previous DOM. Reuses the existing member layout, question summary, answer list, AI chat and links. Delegates status classification to the existing review content utility.
- `pmpReviewContent.ts`: adds a small pure helper to classify all, wrong/answered, unanswered and flagged questions without unnecessary queries.
- Regression guards: assert single question explanation / panel / correct label, unique answer-key styling, filter behavior, four tab accessibility, existing timers and navigation.

There are no migrations, new queries, changed grading calculations, changed answer keys, or changes to the PMP import file format.

## Deployment requirements

The uploaded archive does not include Composer `vendor` or installed npm dependencies. Its existing `public/build` assets are **old** and will not display the changed TSX source until rebuilt. In a checkout with Node.js 22.18+ and dependencies:

```
npm ci
npm run build
php artisan optimize:clear
```

For deployment, upload the new `public/build` assets with the changed source files and refresh the browser. If using a CDN or reverse proxy for static assets, ensure the updated Vite manifest/assets are served. Do not use this package's old `public/build` as proof of the UI fix.

## Verification in this workspace

- PHP source/static regression checks: passed.
- Node TypeScript data/behavior regression tests: passed.
- TypeScript/TSX transpilation checks: passed.
- Laravel feature tests: not runnable without Composer vendor and database.
- Fresh Vite production build: not possible here: Node 22.16 is below the supported minimum; offline `npm ci` also failed on an uncached dependency (`yuku-parser@0.19.0`).
- Live browser visual testing: not performed (no running authenticated Laravel application).

The existing prototype stylesheet and Rajdhani design tokens remain unchanged. Visually verify all four tabs against the supplied prototype after building on the user's system.
