# PMP simulator — strict administrator exam rules and compact UI

Date: 2026-11-20
Scope: PMP exam runtime, member mock start/dashboard views, question bank admin UI, and focused regression coverage only.

## Root cause

Previously the full mock start selected up to `full_question_count` active questions and allowed fewer than configured. If the active bank was short, it proportionally shortened the countdown. The start dialog and dashboard also advertised this fallback. This meant newly activated questions could change the total shown in the timed exam without an administrator editing exam settings.

## New behavior

1. An administrator continues to control `full_question_count` (1-180) and `full_duration_minutes` (1-480) through **Administration → PMP questions & settings → Exam settings**. The card on the question bank tab displays the **saved** full mock configuration and active-bank readiness.
2. Every **new full mock** now contains exactly `full_question_count` questions and uses exactly `full_duration_minutes` minutes. If fewer active questions exist, the start is rejected with HTTP 409 and no attempt is created; the member dashboard indicates the shortage and disables a new full mock.
3. Every **new focused practice** draws exactly `focused_question_count` questions from the selected domain and uses exactly `focused_duration_minutes` minutes. If the domain is too small, a 409 is returned rather than silently creating a smaller session.
4. The existing `selection: new | mixed | random` behavior is preserved. A `new` set with insufficient unseen questions now gets a clear 409; the existing mixed-set dialog continues to offer reuse when needed.
5. Existing in-progress and completed attempts keep their own `question_ids`, `rules_snapshot`, `started_at`, and `expires_at` and are not migrated or reset.
6. The member start dialog shows the exact administrator-defined mock size/duration. The timed exam removes a large forced minimum height, uses tighter question and tool spacing, and keeps answered/remaining/marked counts together in a compact navigator.
7. The admin exam settings are grouped into Full mock, Focused practice, and Sample/performance. Import actions, original 30-column template, and activate-all option remain intact with more concise supporting text.

## Impact and deployment

- **Database:** no migration, no records updated, no destructive operation.
- **Queries:** no new SQL queries added. The previous extra active-question `COUNT(*)` in the new-only start path was removed.
- **Authorization:** unchanged; existing administrator settings and membership access checks remain.
- **Imports:** service, workbook mapping, and import endpoints unchanged. All 30 original fields and import statuses remain supported.
- **Existing attempts:** unchanged on settings edits or new import/activation.
- **Frontend:** build is required to serve updated TSX/CSS; old `public/build` assets in the source archive are not newly compiled.

Recommended local verification:

```bash
composer install
php artisan test --filter=PmpExamStartSelectionTest
php artisan test --filter=PmpExamAdminManagementTest
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Use Node 24 (or another version compatible with the project's installed Vite Plus engine requirements). Use a staging database and existing credentials. Do not run destructive migrations or overwrite live `.env`, user uploads or storage.

## Verification performed here

- PHP lint on the changed controller and feature test: passed.
- TypeScript transpiler syntax diagnostics for six changed TSX/TS modules: passed.
- Node regression suite with `--experimental-strip-types`: 103/104 passed; the unrelated `pmpTutorTokenSourceCheck` expects a `leftJoin('ai_requests as ar'` implementation not present in the supplied PmpQuestionChatController. No AI code was changed.
- Full Laravel feature tests: not executed (Composer vendor packages absent from uploaded archive).
- Frontend `npm ci`: timed out; production build and full TypeScript type-check remain unverified.
