# Public PMP sample — paid simulator question UI reuse

## Scope

Only the public sample exam section (`/exam-simulator/pmp`) has changed. It now uses `ExamOptionList`, `ExamExplanation`, and the existing `.pm-exam-*` question-card, header, option, review, navigator, and calculator styles from the paid exam simulator.

The real member-only `/exams/pmp` page, scoring, question-bank routes, entitlement middleware, and attempt storage are unchanged. All other public landing-page sections and the footer remain untouched.

## How to choose the public question

Edit only `resources/js/components/exam/pmpPublicSampleQuestion.ts`. Set the domain, difficulty, prompt, four option labels A–D, correct answer key, and educational explanations there. This is a deliberately fixed, editorially selected public question. Changes require rebuilding frontend assets; there is no new admin page or database query.

Do not put unpublished or private paid question-bank content into this public file. The explanation and correct key are included in the browser bundle and become visible after checking the answer, so only an approved public example belongs here.

## User interactions

- One 90-second timed preview, continuous wall-clock countdown starting when the question enters the viewport (not while guests are reading the hero).
- Uses the paid exam's visual question header, option selection and answer states, plus question navigator.
- Mark for Review, Strike Through, Highlight (select text while Highlight is enabled), Calculator, Check answer, Try again.
- Shows the correct choice and the same tabbed exam explanation component after submission or timeout.
- Responses, marks and tool state stay in React memory; no save/submit requests, authentication, sessions, or additional backend queries.

## Verification and commands

- Static public PMP contract: `php tests/Regression/PublicPmpPrototypeStaticCheck.php`
- Shared header contract: `php tests/Regression/SharedHeaderPrototypeStaticCheck.php`
- Feature test: `APP_ENV=testing php artisan test --filter=PublicPmpExamPageTest`
- Existing exam test: `APP_ENV=testing php artisan test --filter=PmpExamSimulatorTest`
- Frontend: `npm ci && npm run types:check && npm run build`
- Browser: compare desktop/mobile options and styles with `/exams/pmp`, check timer, marking, strike-through, highlighting, calculator, answer reveal, and reset.

This source bundle has no installed Composer dependencies; the Laravel runtime tests and full Vite build must be run on a development machine with those dependencies. No migration or backfill is required.
