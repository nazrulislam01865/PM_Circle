# PM Circle — Curriculum-linked course questions, practice and resources (2026-11-20)

## Scope

Implemented against the user's latest `Archive 5(4).zip`, preserving existing course routes, enrollment/bookmark records, lesson-body privacy, learning paths, and the dedicated PMP Exam Simulator. No new external package or AI integration.

## Administrator workflow

1. **Course library** `/admin/learning/courses`: create/edit a course and its curriculum, then open **Questions & resources**.
2. **Questions & practice** `/admin/learning/courses/{id}/content`: set exact practice size (1–100) and duration (1–240 minutes), enable/disable practice, create/edit/publish/unpublish objective questions and scenario-based MCQs tied to a curriculum section and topic. Questions use A–D options, a deterministic answer key, difficulty, and an explanation.
3. **Bulk import**: download `PM_Circle_Course_Question_Template.xlsx` (13 headers, blank data), fill correct curriculum section/topic strings and import XLSX or UTF-8 CSV. Optional **Publish imported questions immediately** overrides per-row Publish. Validations include duplicate Question IDs (per course), section/topic membership, options, answer key and row limits. Atomic insertion; no existing questions overwritten. 500 questions and 5 MB per import.
4. **Resources**: create/edit and publish/unpublish either an HTTPS link or a private PDF/Office document (10 MB max), assigned to a curriculum section. Files are stored on the private Laravel `local` disk. Access is checked on every download.
5. **Course cover**: removed default-image dropdown. Existing cover preview and custom JPG/PNG/WebP upload remain. A new upload replaces the cover; canceling selection leaves existing data unchanged. Old courses' built-in fallbacks are retained.

## Member workflow

- The existing course page's **Practice & Exams** tab now displays published-question availability, admin-configured count/time and optional full course / section / topic scope. Practice requires active, eligible membership and enrollment. A shortage rejects the attempt; no silent reduction of question count.
- The practice interface includes a server-corrected timer, per-question autosave through a same-origin CSRF-protected endpoint, navigator, local review flags, finish confirmation, and result/review screen. Submitted attempts are deterministically graded from a frozen question/answer-key snapshot. Answer keys/explanations are never sent to the take screen. At expiry, previously saved answers are scored; no new answers can be saved after the deadline.
- The **Resources** tab lists published resources; actual open/download routes recheck membership and enrollment. The Q&A tab summarizes the available question bank and points members to practice; it does **not** implement a learner discussion forum or AI-evaluated open-ended scenarios.
- The existing PMP course link to the dedicated PMP Exam Simulator remains available.

## Database impact

Additive migration `database/migrations/2026_11_20_000002_create_learning_course_practice_content.php`:

- `learning_courses`: `practice_question_count`, `practice_duration_minutes`, `practice_enabled`.
- `learning_course_questions`: scoped course question bank, curriculum strings, answer key/options, status and indexes.
- `learning_course_resources`: private files/HTTPS links, publication status and indexes.
- `learning_course_practice_attempts`: owner, frozen question snapshots, answers, scored/expired status and server deadline.

No data-clearing operations, production modifications, or destructive migrations were performed. Existing questions/enrollments/learning paths remain unchanged.

## Verification and limitations

- PHP syntax checks for changed PHP files: passed.
- TSX syntactic parsing for changed TSX files: passed.
- Node.js regression suite: 109/109 passed (105 existing, 4 new static contract checks).
- Workbook checked for exact 13 headers, a blank template and validation dropdowns.
- Laravel/PHPUnit feature coverage added in `tests/Feature/Learning/CoursePracticeContentTest.php`. **Not executed here**: the supplied ZIP does not contain Composer `vendor` dependencies.
- `npm ci --offline` failed because `yuku-parser` was not cached; the local container's Node 22.16 also falls short of the project's Vite Plus engine minimum. **No full TypeScript type-check or production Vite build can be claimed here.** Use Node >=22.18, preferably Node 24.11+.

## Install/upgrade

Back up the database and any custom uploaded course covers/resources. Apply the updated source files, ensure writable Laravel storage and cache directories, then (from the project root):

```bash
composer install
php artisan migrate
npm ci
npm run types:check
npm run build
php artisan test --filter=CoursePracticeContentTest
php artisan test --filter=LearningCourseManagementTest
php artisan optimize:clear
```

In production, review and back up first, then `php artisan migrate --force`, deploy the compiled `public/build` assets, and restart/reload the PHP service as appropriate. Do **not** overwrite production `.env`, `storage/app`, or database with archive content.
