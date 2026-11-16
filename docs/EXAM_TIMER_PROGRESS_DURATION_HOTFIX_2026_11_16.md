# PM Circle — Timed exam progress duration hotfix (16 November 2026)

## Confirmed cause

The paid PMP attempt endpoint supplied `durationSeconds` by calling `diffInSeconds`
from expiry **backward** to start. On Carbon 3 this is a signed difference and
can be negative. `Take.tsx` rejected it, fell back to the remaining seconds at
page load, and thus the progress bar restarted at ~100% after any resume, even
if the exam had little time remaining. Additionally, the browser was calculating the countdown from its local clock. A device running behind the server can show more time than the configured attempt length, leaving a clamped 100% bar until the displayed clock falls below the attempt duration.

## Changes

- `app/Http/Controllers/Exam/PmpExamController.php`: calculate the immutable full
  attempt duration from start to expiry, specifying an absolute difference.
- `resources/js/pages/exam/Take.tsx`: tolerate older negative duration values
  by taking their absolute value instead of discarding them. Use the optional
  server clock timestamp to correct browser clock skew. Both timer and bar derive
  from the same server-synchronized remaining seconds. Answer persistence,
  scoring and submission logic are unchanged.
- `resources/js/components/exam/examTimeProgress.ts`: add two pure clock utilities.
  Old payloads without `serverNow` still use the previous local-clock fallback.
- Update focused source and pure math tests to cover the signed duration and
  resuming an exam when only 25% of its time remains, and a 30-second device clock skew.

## Verify

```sh
php -l app/Http/Controllers/Exam/PmpExamController.php
php tests/Regression/ExamTimerFooterStaticCheck.php
node --experimental-strip-types --test tests/Regression/examTimeAndFooter.test.mjs
npm run types:check
npm run build
php artisan optimize:clear
```

On a development exam, start a 10-minute session and let 1–2 minutes pass. The
remaining bar should show approximately 80–90%. Refresh or revisit the attempt;
it must retain that value rather than filling back to 100%. Verify expiry at 0%.
The bar moves approximately 0.167% per second for a 10-minute attempt and can
look nearly unchanged during a single second; that behavior is mathematically
correct.

## Scope

No migration, new query, routing change, footer change, secrets or production
deployment. Do not alter active attempt timestamps.
