# Learn & Practice — Course management dropdowns and UI alignment (2026-11-20)

## Scope

- Latest supplied `Archive 6(4).zip` project and included PM Circle UI Style Guide.
- The course editor, course-content manager, central admin dropdown component, master-data catalog, and actual course-catalog filters only.
- No changes to enrollment, scoring, practice timers, course slugs, or membership-entitlement logic.

## Behavior

1. Admin course fields `Category`, `Level`, and `Membership access` load their active choices from `master_data_options` through `CourseMasterData`. Labels and order follow Master Data. Existing values remain selectable when previously archived, so old courses remain editable.
2. Admin question forms and filters use the same choices for `Question type` and `Difficulty`, and admin resource forms use them for `Resource type`. Curriculum section/topic options still come from that course's own saved outline, not from unrelated global master data. Correct-answer letters remain A–D by design.
3. The shared `AdminChoice` component reuses the project's existing Radix Select dependency. Trigger, open list, focus, selected state, error, and mobile sizing are styled with centralized PM Circle CSS tokens. The native macOS select menu is no longer used in these course forms.
4. The course resource table is shown first; `Add resource` opens a focused form below the table. Existing Edit controls open the same form. File uploads and question-import file controls have a shared clickable filename picker.
5. The public course catalog's category and level filters derive their choices from the currently displayed learning items instead of the old fixed arrays, supporting master-data categories and custom level labels without extra database requests.

## Master Data groups

| Group | Default values | Admin behavior |
|---|---|---|
| `course_category` | Existing seven categories + categories already stored on courses | Add, relabel, sort, activate/deactivate |
| `course_level` | Beginner, Intermediate, Advanced + levels already stored | Add, relabel, sort, activate/deactivate; max 20 characters |
| `course_access` | `free`, `paid` | Relabel, sort, activate/deactivate only; underlying identifiers are fixed |
| `course_question_kind` | `question`, `scenario` | Relabel, sort, activate/deactivate only |
| `course_question_difficulty` | `Easy`, `Moderate`, `Hard` | Relabel, sort, activate/deactivate only |
| `course_resource_kind` | `file`, `link` | Relabel, sort, activate/deactivate only |

The additive migration `2026_11_20_000003_add_course_dropdown_master_data.php` inserts **only missing** master records and preserves previously saved values, labels and activation state. Its rollback intentionally leaves admin-edited master data untouched. No existing course rows are changed.

Form requests check active master values server-side; updates to an existing course/question/resource may retain its own archived value. Bulk course-question imports also validate types/difficulty against active choices once per import, not once per row. Semantic identifiers still match the supported application code.

## Performance and security

- One indexed, column-selective Master Data query per relevant admin page or validation request.
- No extra queries from the public course filter, which derives data from its existing payload.
- No new libraries, subscription entitlements, API endpoints, or queue workers.
- Admin-only routes and existing upload validation remain unchanged.

## Checks in this environment

- PHP syntax: 10 relevant PHP files including migration and new tests passed.
- JavaScript regression: 112 of 112 tests passed, including 3 newly added course dropdown contract checks.
- TypeScript/TSX syntax: parsed using the installed TypeScript compiler (no parse errors).
- Laravel feature integration tests: new `CourseMasterDataTest.php` added, but not executed (the uploaded source has no Composer `vendor` directory).
- Full `npm run types:check` / production build: not executed; offline `npm ci` failed because a required package was missing from the cache, and the local Node version is below the dependency's supported version. Run with Node >= 24.11.

## Local deployment

```bash
composer install
php artisan migrate
npm ci
npm run types:check
npm run build
php artisan test --filter=CourseMasterDataTest
php artisan test --filter=LearningCourseManagementTest
php artisan test --filter=CoursePracticeContentTest
php artisan optimize:clear
```

Back up PostgreSQL before applying production migrations. After the migration, open **Administration → Master data** to edit course dropdown choices.
