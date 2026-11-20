# Learn & Practice — Database-driven course library (2026-11-20)

## Existing implementation reviewed

- Public `/learning` and member `/dashboard/learning` shared `learning/Catalog.tsx` and `CourseCard`.
- Existing course pages shared `learning/CourseShow.tsx` and `CourseDetail` (overview, objectives, curriculum, study notes, access).
- Source courses were read from the PHP config `config/demo-learning-courses.php`.
- Existing enrollment and bookmark tables use `course_slug`; these records must not be changed.
- Existing admin screens use `AdminLayout`, `pm-admin.css`, and the centralized design tokens.

## Implementation

- Added `learning_courses` table, matching the course-details data structure, publication status, order, and optional public cover path.
- Migration imports the existing config catalog **one time** with unchanged slugs and published status. It materializes existing fallback objectives and curricula to preserve the course-details presentation.
- Public catalog now reads only published courses from PostgreSQL; member enrollment and bookmark lookups retain the existing slug-based tables and endpoints.
- Detail route gates study-note bodies server-side behind joining, enrollment, and plan eligibility.
- New `/admin/learning/courses` section has searching, publication filters, server-side pagination (15 records/page), course statuses, and edit/publish actions.
- Separate Add/Edit Course screen includes title, summary, overview, category, level, duration, access, built-in/custom cover, objectives, curriculum sections/topics, study notes, and draft/publish setting.
- Title generates a unique slug on creation; editing cannot change the slug, protecting existing enrollments and bookmarks.
- Optional cover uploads are validated as an image (JPEG/PNG/WebP, up to 3 MB) and stored on Laravel's `public` filesystem disk.
- Existing learning paths, quizzes, PMP exams, and membership billing were not restructured.

## Changed files

- `database/migrations/2026_11_20_000001_create_learning_courses_table.php`: database schema and legacy catalog migration.
- `app/Models/LearningCourse.php`: model and public-safe catalog projection.
- `app/Domain/Learning/Queries/DemoCourseCatalog.php`: database-backed catalog, minimal access lookups.
- `app/Http/Controllers/Admin/LearningCourseController.php`: admin list/create/edit/publish functionality.
- `app/Http/Requests/Admin/SaveLearningCourseRequest.php`: admin authorization, nested field validation, image validation.
- `app/Http/Controllers/Learning/DemoCourseController.php`: lighter enrollment/bookmark queries; current content gates retained.
- `routes/web.php`: admin course routes under existing `pm.admin` middleware.
- `resources/js/pages/admin/LearningCourses.tsx`: paginated course management table.
- `resources/js/pages/admin/LearningCourseEditor.tsx`: course editor.
- `resources/js/layouts/admin/AdminLayout.tsx`: new course library sidebar link.
- `resources/js/types/learning.ts`, `resources/js/pages/learning/Catalog.tsx`, `resources/js/components/learning/CourseCard.tsx`, `resources/js/components/learning/CourseDetail.tsx`: dynamic cover and category support; course copy aligned to live content.
- `resources/css/pm-admin.css`: scoped layout styles using existing tokens.
- `tests/Feature/Learning/LearningCourseManagementTest.php`: admin security, create/edit/draft/publish, slug retention, lesson privacy.
- `tests/Regression/learningDynamicCatalogContract.test.mjs`: static regression contracts.

## Deploy / local development

From the updated application directory (with `.env` already configured):

```bash
composer install --no-interaction
php artisan migrate
php artisan storage:link  # only if the public symlink is missing and you use local uploaded covers
npm ci
npm run types:check
npm run build
php artisan test --filter=LearningCourseManagementTest
php artisan optimize:clear
```

For production, back up PostgreSQL first and use `php artisan migrate --force` after verifying the backup. Migrations **do not modify** the existing enrollment or bookmark tables. Do not run destructive reset/refresh operations in production.

`config/demo-learning-courses.php` is retained exclusively to supply the original data to a new migration. Editing that config does **not** change the live catalog after migration. Manage live courses in the administrator interface.

## Verification performed in the packaging environment

- All changed PHP files: syntax valid (`php -l`).
- New and existing JavaScript regression suite: 105 passing.
- Changed TSX files parsed with TypeScript compiler API, no syntax errors.
- Full `npm run types:check`, production `npm run build`, and PHP feature tests **not run to completion**: uploaded source ZIP lacks full `node_modules` and `vendor` dependencies. Execute in a configured local application before deployment.

No changes were deployed to production.
