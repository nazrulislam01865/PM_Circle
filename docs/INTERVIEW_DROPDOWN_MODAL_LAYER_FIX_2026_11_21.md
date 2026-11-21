# Interview Preparation — modal dropdown stacking fix (2026-11-21)

## Cause

The reusable `AdminChoice` component uses a Radix Select portal that renders the menu under `document.body`. The Interview Preparation form modal overlay is `z-index: 1000`, while the shared menu is `z-index: 120`. The menu opens underneath the overlay and cannot be selected.

## Minimal fix

- `AdminChoice` now accepts an optional `contentClassName` and passes it to its Radix Select content. All existing callers retain their original behavior.
- Only the Interview Preparation modal dropdowns (option group, question set, question type, set applicability fields, import destination) receive `pm-interview-admin-choice-content`.
- The Interview Preparation stylesheet raises only those popup menus above the modal to `z-index: 1010`. Other admin dropdowns remain at their existing level.

No routes, permissions, database records, fonts, option values, import/delete behavior, or interview sessions are changed.

## Verification

- Focused Node regression tests: 6/6 passing.
- Edited TypeScript/TSX modules: syntax transpilation passed.
- Chromium CSS stacking/click fixture: 390, 800, and 1440 px passed.
- Full Laravel/UI integration and production frontend build were not run in this environment; rebuild the frontend locally and test the actual admin dialogs before deploying.
