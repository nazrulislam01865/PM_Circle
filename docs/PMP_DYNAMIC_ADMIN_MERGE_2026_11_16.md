# PM Circle - Dynamic PMP Administration Merge (16 November 2026)

## Merge basis

- Base: the user's latest Archive(10).zip.
- Feature: PM_Circle_PMP_Dynamic_Admin_Changed_Files.zip, previously delivered.
- Method: overlay only the 27 PMP-feature files on top of the base archive; keep all other original files byte-for-byte unchanged.
- This note is the only additional file introduced by the merge operation itself.

## Included functionality

- Protected admin question-bank and exam-settings screen: `/admin/exam-simulator/pmp/questions`.
- Add, edit, activate/deactivate, filter, and paginate PMP questions.
- CSV / XLSX / DOCX upload with validation and all-or-nothing import, up to 1,000 questions per file.
- Admin-configurable durations, question counts, question shuffle, public sample choice, and result thresholds.
- Runtime settings applied to *new* attempts; ongoing attempts retain saved question selections, deadlines, and rules.
- Reuse of the existing PMP simulator, public sample UI, result report, and admin layout.

## Preserved existing latest-source changes

- Header-height values in `resources/css/pm-design-tokens.css`, including the base's 5rem value.
- Countdown timer fixes, `examCountdownMath.ts`, and `ExamTimeProgress.tsx` (no casing collisions reintroduced).
- Exam result spacing and footer behavior, profile rewards, member follow state, post reactions, and Saved/Hidden feed tabs.
- All other base files not listed in the feature patch were retained without modification.

## Database changes

New migration: `database/migrations/2026_11_16_000004_create_pmp_exam_settings.php`.

This creates PMP settings, adds an index to the question bank, and adds `mode` and `rules_snapshot` to exam attempts. No existing attempts are deleted or rescored. Review and back up the database before production deployment.

## Checks performed while merging

Passed:
- PHP syntax for modified controllers, services, requests, migration, and routes.
- `tests/Regression/PmpDynamicAdminStaticCheck.php`.
- `tests/Regression/ExamResultLayoutImportCheck.php`.
- `tests/Regression/ExamTimerFooterStaticCheck.php`.
- `tests/Regression/PmpPersonalDashboardContractCheck.php`.
- `tests/Regression/PersonalFeedScopesStaticCheck.php`.
- `tests/Regression/PostReactionRosterStaticCheck.php`.
- `tests/Regression/ProfileRewardStaticCheck.php`.
- Five Node countdown/footer tests.
- TypeScript/TSX syntax parsing for nine changed files, and CSS parsing for the admin styles.

Known baseline failures, confirmed on the unmodified latest archive too:
- `ContactPageAndFooterStaticCheck.php`: contact page width/spacing source assertion.
- `SharedFooterCoverageCheck.php`: member/guest reserved footer space source assertion.

Not run/verified in the packaging environment:
- Full Laravel feature tests or actual PostgreSQL migration (no installed vendor dependencies/database).
- Full TypeScript semantic check or Vite build (no installed project npm dependencies).
- Browser UI verification, and real XLSX/DOCX import tests.

## Apply locally

Back up your current working directory, then extract the **changed-files** archive over your PM Circle root, preserving directory paths. Do not replace `.env` or private storage with an archive copy.

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
php artisan migrate:status
php artisan migrate
php tests/Regression/PmpDynamicAdminStaticCheck.php
php artisan test --filter=PmpExamAdminManagementTest
php artisan test --filter=PmpPersonalDashboardTest
npm run types:check
npm run build
php artisan optimize:clear
```

Ensure Node 22.18+ and PHP zip/dom extensions for document imports. Verify the admin page and import with a sample question before using in production.

Production deployment, destructive migrations, and admin seeding were **not** performed.
