# PM Circle — Exam Result layout and marker alignment (2026-11-16)

## Reported issue

The result report used an extra 1120px content-width cap inside the standard 1480px member page container, creating unusually large empty margins. The "Your result" marker's label and triangle were taller than the 29px space reserved above the colored readiness bands, causing the triangle to overlap the band label.

## Changes

- `resources/css/pm-exam-simulator.css`: the result page now fills the existing `.pm-dash-body` member content container. The existing shared header, footer, and no-sidebar structure remain untouched.
- The score indicator has a dedicated 40px (`--s10`) lane with its label and triangle bottom-aligned above the readiness bands. The triangle no longer sits on top of colored band text.
- `tests/Regression/ExamResultLayoutImportCheck.php`: adds checks for the member-container width and non-overlapping marker layout.

## Safety / scope

No changes to exam grading, readiness thresholds, attempt data, navigation, user roles, database, routes, or server queries. No migration is required. Both changes are CSS-only, with one updated source regression test.

## Apply

Copy the ZIP's files onto the equivalent paths in your existing PM Circle project (preserve directory structure). Then run:

```bash
php tests/Regression/ExamResultLayoutImportCheck.php
php tests/Regression/ExamTimerFooterStaticCheck.php
node --experimental-strip-types --test tests/Regression/examTimeAndFooter.test.mjs
npm run types:check
npm run build
php artisan optimize:clear
```

Use a Node release that supports `--experimental-strip-types` (Node 22.18+ recommended for this project); if running Node 20, the node test command is not supported, so upgrade Node rather than changing source code.

## Verification in provided archive

- Result layout/import regression: PASS (6 assertions)
- Exam timer/footer source regression: PASS (9 assertions)
- Shared footer source regression: PASS
- Contact/footer source regression: PASS
- Countdown Node tests: PASS (5 tests)
- CSS syntax parsing: PASS
- Full Vite build and in-app browser screenshot comparison: NOT RUN (archive lacks installed frontend and PHP dependencies)

The visual change should also be checked at desktop, tablet and mobile widths in the running application, especially after browser zoom/font changes.
