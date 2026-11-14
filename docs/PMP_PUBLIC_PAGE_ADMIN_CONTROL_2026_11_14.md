# PM Circle — PMP Public Page Admin Controls

**Scope:** Only the public PMP landing page and a dedicated admin editor. The paid exam simulator, authentication, pricing table, community, billing, and existing homepage are unchanged.

## Public behavior

- `/exam-simulator/pmp` is still a public page. It now reads **one `home_page_contents` record** (`key=pmp_public`) and falls back to `config/pmp-public.php` without writing defaults to the database.
- Hero **Compare plans** opens the **existing** `/pricing` page. **Try a sample question** scrolls to `#sample-question`.
- The AI study-help area displays **four cards**, using the same reusable card component as the existing four benefits.
- The sample uses the existing `PmpPublicSampleExam` / paid exam option components and continues using a local, deterministic demonstration question. `sample.question_id` is intentionally forced to `null` on save. Admin question selection will be implemented only after questions/requirements are approved.
- Plan comparisons use four fixed plan columns; each row is either **Text** (can include line breaks) or **Checkbox**. Recommended styling for the third column is preserved. Pricing and checkout are illustrative; no payment endpoint is created.
- FAQ entries, approved video URL and feedback points, learner testimonials, section visibility, footer menu labels/destinations, social links/icons, payment labels, legal copy, and newsletter display text are editable. The newsletter action remains disabled.
- Existing legal, consent, pricing, privacy and admin authorization behavior is preserved.

## Administrator workflow

Open `/admin/exam-simulator/pmp`. The editor is in the existing admin sidebar under **PMP public page**. Select one of nine sections; edit fields, upload icons, and select **Save changes**. Only saved content is published. The **Preview page** link opens the public page in a new tab.

Icons and photos reuse the existing authenticated `POST /admin/homepage/images` uploader. Only PNG, JPG, or WebP files up to 2 MB are accepted; icon previews display at 32–36px. Uploaded URLs are checked against Laravel's public storage URL prefix (no unrestricted remote image paths). `php artisan storage:link` is required if not already configured.

## Security and performance

- Existing `auth`, `pm.admin`, `verified` middleware and `is_admin` Form Request validation guard the editor.
- `PUT` is rate-limited, all nested JSON fields are allowlisted, lengths and row counts are bounded, plan checkbox values must be real booleans, footer internal destinations must match existing public GET routes, and media/social links require HTTPS.
- Page revisions are checked under a database row lock, preventing stale editors from silently overwriting saved changes.
- The public route performs one new indexed content-record read, with no question-bank queries, external API calls, queue jobs, payment operations or migrations.
- Large icons should be resized/compressed before upload. Do not publish fake learner testimonials; approved quotes and media should be used.

## Files

**New:** `config/pmp-public.php`, `app/Support/Exam/PmpPublicContent.php`, `app/Http/Controllers/PublicSite/PmpPublicPageController.php`, `app/Http/Controllers/Admin/PmpPublicPageController.php`, `app/Http/Requests/Admin/UpdatePmpPublicPageRequest.php`, `resources/js/types/pmp-public.ts`, `resources/js/components/exam/PmpPublicIcon.tsx`, `resources/js/pages/admin/PmpPublicPage.tsx`, `tests/Feature/Admin/PmpPublicPageAdministrationTest.php`.

**Updated:** `routes/web.php`, `resources/js/pages/exam/Public.tsx`, `resources/js/components/exam/PmpPublicSections.tsx`, `resources/js/components/exam/PmpPublicFooter.tsx`, `resources/js/components/pm/SiteFooter.tsx`, `resources/js/layouts/pm/PublicLayout.tsx`, `resources/js/layouts/admin/AdminLayout.tsx`, `resources/css/pm-pmp-public.css`, `resources/css/pm-admin.css`, `tests/Regression/PublicPmpPrototypeStaticCheck.php`, `tests/Regression/SharedHeaderPrototypeStaticCheck.php`.

## Validation and deployment

```bash
php artisan optimize:clear
php artisan storage:link  # only if public/storage does not already exist
npm run types:check
npm run build
php tests/Regression/PublicPmpPrototypeStaticCheck.php
php tests/Regression/SharedHeaderPrototypeStaticCheck.php
APP_ENV=testing php artisan test --filter=PmpPublicPageAdministrationTest
APP_ENV=testing php artisan test --filter=PublicPmpExamPageTest
APP_ENV=testing php artisan test --filter=PmpExamSimulatorTest
```

**Do not run** destructive database commands (`migrate:fresh`, `db:wipe`). This change requires **no migration**, backfill, or new environment keys. Ensure Node >=22.18 for the installed Vite Plus version.

## Verification status in artifact environment

PHP syntax and two dependency-free regression scripts: **passed**. TSX/TS syntax parsing: **passed**. Full TypeScript semantic checking and Vite build: **not verified** because the installed package tree was incomplete, npm install timed out, and the environment's Node version (22.16) is below Vite Plus's required Node >=22.18. Laravel tests and PostgreSQL integration: **not run** because `vendor` and database drivers are not installed in this environment. No production database or server was changed.
