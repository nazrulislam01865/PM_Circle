# PM Circle public learning layout and course details — 2026-11-23

Source: Archive 9.zip. Visual references: supplied Learn & Practice alignment screenshot, supplied Project Management Foundations details screenshot, and `PM_Circle_Design_Guidelines (1)(2).html`.

## Changes

- `resources/css/pm-learning-public.css`: removed the extra horizontal padding on `.pm-learn-v3-main`, aligning the public listing content (starting-point card, topic chips, filters, results) with the breadcrumb/hero and the shared homepage header/footer rail. Preserved the existing screenshot rail, 1180px guide maximum, and mobile gutters.
- `resources/js/pages/learning/CourseShow.tsx`: renders a new public course view using the homepage header, offer bar and footer. The existing `/dashboard/learning/courses/{slug}` branch retains its prior course dashboard and tools.
- `resources/js/components/learning/PublicCourseDetail.tsx`: prototype course detail layout using the existing controller-provided course, lesson, objective and outline data. The sidebar uses the existing enroll callback and membership/access decisions. Gated notes and member practice/resources are still accessible when eligible.
- `resources/css/pm-learning-course-public.css`: scoped responsive detail styles using centralized design variables and shared button styling.
- `resources/css/pm-design-tokens.css`: added a semantic course-cover aspect ratio token.
- `resources/css/app.css`: imports the new public-only stylesheet.
- `tests/Regression/learningPublicPrototype.test.mjs`: updated alignment contract.
- `tests/Regression/learningPublicCourseDetailPrototype.test.mjs`: new regression checks for public layout and preserved business actions.

## Preserved

Course routes, controllers, published course queries, enrollments, membership eligibility checks, save/share operations, admin-managed content, study-note privacy, and practice start operations. No database migration or additional query was introduced. The member course detail page retains its original layout.

## Verification

- 203/203 JavaScript regression tests passed using Node's experimental strip-types option and a **temporary** local symlink to the already bundled legacy UI guide for the Activity Log test. The temporary symlink was removed and is not included in this deliverable.
- PHP syntax for `routes/web.php` passed.
- TypeScript TSX transpilation/syntax checks passed for both updated/new components.
- CSS parsed successfully for both edited stylesheets and the central token source; referenced guide tokens were verified.
- Production frontend build, full semantic TypeScript checking and browser pixel comparison were **not** completed here because project npm dependencies are absent.

## Apply locally

Extract the patch at the project root. Do **not** replace `.env`, database, or private storage content. With Node.js 22.18+:

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Validate `/learning`, a published course URL such as `/learning/courses/project-management-foundations`, and the member course URL under `/dashboard/learning/courses/` on desktop and mobile. Check both guest and eligible member enrollment flows.

## Detail heading size correction (follow-up)

The reference course-details prototype uses a compact title scale, distinct from the larger generic banner H1. The public course-details heading now uses the centralized `--pm-guide-text-course-title: clamp(2rem, 3vw, 2.25rem)` token (32–36px), instead of the generic `--pm-guide-text-h1` token (up to 49.6px). This is scoped to `.pm-course-public-heading h1`; public Learn & Practice listing headings, homepage, footer and authenticated course dashboard are unchanged. No application logic, queries or database migration changed.

### Verification of the title-only follow-up

- The 9 targeted public-learning regression tests passed.
- The full Node regression run reported **209 passed, 1 failed** (210 tests). The failure is an unrelated existing assertion in `pmpTutorTokenSourceCheck.mjs` expecting `leftJoin('ai_requests as ar'` in `PmpQuestionChatController.php`. That controller is byte-for-byte unchanged from the previous release. It was deliberately not modified in this layout-only correction.
- Edited CSS files parsed successfully and `php -l routes/web.php` passed.
- Browser visual comparison and production compilation were not available in this sandbox; confirm the title appearance at your usual desktop and mobile widths after rebuilding assets.
