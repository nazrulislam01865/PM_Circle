# Dynamic course management - 2026-11-26

## Admin workflow

Open `/admin/learning/courses`. Create a course or edit an existing course. Enter the title, category, type, topic tags, access, cover, description, objectives, study duration, provider, FAQ and optional public practice examples. Build the curriculum as sections and topics, add ordered lessons and assign them to topics. Save before adding documents. Use **Manage lesson documents** from a saved lesson, or the resources tab of the course content workspace. Select a lesson or a shared section, add a file or link, and set its publication status. Configure the scored question bank separately. Review moderation is available from the course list and content workspace. Publish the course when ready.

The existing catalog, lesson player, enrollments, saved courses, member plan restrictions, progress and certificate flow are retained. The public course details page keeps its existing composition and centralized CSS. Ratings now come only from published member reviews; sample rating/review data is no longer rendered. Standard access, video and study-duration FAQs are derived from course data; additional FAQs and public practice examples can be authored in the editor. No new courses or fabricated reviews are seeded. Existing published PMP practice examples retain their previous copy as editable defaults.

## Lesson documents

A resource can be linked to a particular lesson by stable UUID, or shared by a curriculum section. The player displays only applicable published resources. Public detail pages list published resource metadata, not private file paths or contents. Downloads still require an eligible enrollment and an active member. Files (up to 10 MB) are validated by the existing resource upload workflow and stored privately. An admin cannot remove a lesson with attached resources until those resources are reassigned; changing the lesson's section updates its attached resources. Existing legacy lessons receive UUIDs during migration. Exact unambiguous topic-title matches are mapped automatically; review other lesson placements in the editor. Legacy section-level documents stay section-level. Existing progress hashes ignore new association fields.

## Database and rollout

Back up PostgreSQL and private storage. Keep the deployed `.env` and storage. Run with a supported PHP version and Node 22.18+ within the 22.x line:

```sh
composer install
npm ci
php artisan optimize:clear
php artisan migrate
npm run types:check
npm run build
php artisan optimize
```

Migration `2026_11_26_000005_extend_course_management.php` adds `learning_courses.presentation`, `learning_course_resources.lesson_uid` plus an index, the unique-per-member/course `learning_course_reviews` table, and backfills lesson IDs and eligible topic associations. No seeder is required. Do not run rollback in production without backup: it would discard newly created reviews and presentation/attachment metadata. Existing private files are not included in this source archive and must be retained on deployment.

## Verification performed in the editing environment

- Original uploaded source regression suite: 480/482 passed.
- Updated source regression suite: 486/488 passed; the identical two failures relate to the existing PMP full mock counter and profile header/import/privacy tests.
- Six new targeted source/behavior checks: all passed.
- 20 PHP files syntax-checked; 10 TypeScript/TSX files syntax-transpiled; two CSS files parsed.
- Five Laravel feature tests are included in `tests/Feature/Learning/CourseDynamicManagementTest.php`. They have not been run: Composer and vendor packages are unavailable. The offline npm install failed on an uncached yuku-parser dependency; the environment Node version is also below Vite Plus's supported 22.x minimum. No full type check, production build, database migration execution, authenticated browser rendering or live file upload has been verified.

Run integration tests with an isolated test database: `php artisan test --filter=CourseDynamicManagementTest`. Test the create/edit/publish workflow, topic placement, actual uploads, unauthorized downloads, saved progress and review submission/approval before production deployment. This update does not modify or deploy the production server.
