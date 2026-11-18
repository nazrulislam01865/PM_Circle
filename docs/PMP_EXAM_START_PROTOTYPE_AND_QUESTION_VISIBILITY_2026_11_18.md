# PMP Exam Start — Prototype Alignment and Imported Question Availability

## Scope

Based on `Archive 4(4).zip` and the four screenshots `ex1.png`–`ex4.png`. No public-page redesign, AI integration, membership changes, scoring changes, or destructive migrations.

## Exam-start dialog

- Reusable `PmpStartExamDialog` using the installed Radix dialog (focus management, Escape handling, backdrop, accessible title/description) and PM Circle design tokens.
- Initial state: private past-attempt summary, scores, unseen bank coverage, and choice of new-only vs random.
- Fewer unseen questions than the configured full mock: explicit mixed-set confirmation showing counts, Back, and Start Mixed Set.
- Entire active bank already issued: 100% progress bar, informational notice, and random-only option.
- Preparing state: progress indicator while POST /start runs, with automatic navigation to the existing Take page.
- Clicking outside cannot accidentally discard the dialog. It cannot be closed during preparation, preventing duplicate requests; failed starts return to the dialog with a message.
- The dialog data is loaded **only when Start a New Mock Exam is clicked**. Existing dashboard queries remain unchanged; focused-practice starts continue using the existing direct path.
- Colors, text sizes, line heights, buttons, control dimensions, corners, and spacing use `resources/css/pm-design-tokens.css`, and existing `.pm-pmp-primary` / `.pm-pmp-secondary` classes. CSS is isolated from the rest of the application.

## Server selection rules

- `/exams/pmp/start-options` is member-protected, rate-limited, and returns active-bank count, all-time distinct member-issued question count, unseen count and configured full exam size.
- `PmpQuestionPool` expands `question_ids` in PostgreSQL (SQLite JSON1 equivalent for the project tests); distinct IDs are joined to the currently active question bank. No client-provided question IDs are accepted.
- `selection=new` returns previously unissued active questions only. If fewer than the required set exist, the server returns 409 without creating an attempt.
- `selection=mixed` uses all remaining unseen active questions, filling the rest from previously issued active questions, without duplicates inside an attempt.
- `selection=random` retains the existing selection behavior. Focused practices are unchanged.
- Selection happens inside the existing user-row locking transaction, with existing immutable question snapshots and rules, server-side scoring and permission checks.

## Imported question visibility

**Confirmed root cause:** the Excel importer originally stored every 30-column workbook question with `is_active=false`, and the exam only selects `is_active=true`.

- Imported workbook rows marked `Review Status = Approved` become active at import. All other statuses remain inactive.
- Existing approved-but-inactive imports appear as a count in admin PMP management; an explicit admin-only, throttled "Activate approved questions" action publishes them in a single guarded update.
- Editorial drafts / in-review / rejected items never activate from this action. Admin may review their content and approve via the existing editor; no silent batch approval is provided.
- Original workbook's 30 columns, import validations, unique codes, and existing issued question data are preserved.
- After an admin activates questions, refresh `/exams/pmp` to update available-question count. No database migration is required.

## Files

- `resources/js/components/exam/PmpStartExamDialog.tsx`: reusable four-state modal.
- `resources/js/components/exam/useExamStart.ts`: selection payload and guarded success/error return.
- `resources/js/pages/exam/Index.tsx`: opens the modal, fetches coverage only on demand and handles the new/mixed/random sequence.
- `resources/css/pm-pmp-start-dialog.css`, `resources/css/app.css`: scoped token-driven modal styling and import.
- `app/Services/Exam/PmpQuestionPool.php`: member-scoped all-time issued question IDs.
- `app/Http/Controllers/Exam/PmpExamController.php`, `routes/web.php`: options endpoint and server-enforced selection.
- `app/Services/Exam/PmpQuestionImporter.php`: activate workbook rows explicitly marked Approved.
- `app/Http/Controllers/Admin/PmpExamBankController.php`, `resources/js/pages/admin/PmpQuestionBank.tsx`: existing approved-but-inactive publication control.
- `tests/Feature/Exam/PmpExamStartSelectionTest.php`: question coverage, member isolation, mixed set, approved-only activation and imports.
- `tests/Regression/pmpExamStartDialog.test.mjs`: static UI/backend contracts.

## Actual verification in the supplied container

- PHP syntax checks completed successfully on changed PHP files.
- TypeScript/TSX syntactic transpilation completed successfully with the installed global TypeScript parser.
- Targeted Node regression tests for PMP dashboard/import and new modal pass. Existing PHP static checks pass.
- Isolated CSS/HTML Chromium renders were inspected at 1047×580 and 390×844. The modal widths and major prototype states fit without horizontal overflow. This does **not** constitute a rendered Laravel/React session.
- Full `npm ci`, Vite build and Laravel feature tests were **not** completed: the container lacks required cached npm packages, PHP database drivers and Composer dependencies. Run them in your configured local project.

### Test and deployment steps

```sh
npm ci
npm run types:check
npm run build
php artisan optimize:clear
php artisan test --filter=PmpExamStartSelectionTest
php artisan test --filter=PmpExamAdminManagementTest
node --test tests/Regression/pmpExamStartDialog.test.mjs
```

No database migration is required. Clear caches and restart PHP processes if your local server uses OPcache.

### Existing timer behavior

This release does not change the existing timer/start timestamp logic. The existing controller creates the attempt and sets `started_at` when POST `/exams/pmp/start` succeeds; the screenshot's line about the timer starting when Question 1 opens is display copy, not a change to timing semantics. A true "start on first question view" behavior requires separate approval and regression testing to avoid altering ongoing attempts.
