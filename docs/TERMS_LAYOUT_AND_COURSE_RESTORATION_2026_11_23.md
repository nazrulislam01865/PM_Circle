# PM Circle: Terms layout correction and old course-details restoration

Source: Archive 11.zip. Old course page source: Archive 8(1).zip.

## Scope
- **/terms**: retain the existing eleven-section approved draft text and the shared homepage header/footer, correct the article's line length, make body copy use the approved 16px guide scale, restore the shared banner's bottom spacing and underline for links, and apply responsive shared gutters.
- **/learning/courses/{slug}** and existing member course detail route: restore `resources/js/pages/learning/CourseShow.tsx` byte-for-byte from Archive 8(1).zip. This includes the previous overview/curriculum/practice/resources tabs and enrollment/save/share logic. No controllers or database queries were changed.
- Stop importing the now-unused newer public course-detail stylesheet; its source files were left in place to avoid destructive cleanup.
- Preserve the working application's homepage header/footer, not the prototype's placeholder footer text or sample data.

## Modified files
1. `resources/css/pm-terms.css` - Terms scoped layout and typography.
2. `resources/css/pm-design-tokens.css` - centralized prose width for legal pages.
3. `resources/css/app.css` - remove unused CSS import for replaced new course design.
4. `resources/js/pages/learning/CourseShow.tsx` - exact Archive 8(1).zip version.
5. `tests/Regression/termsPrototypeGuideline.test.mjs` - layout token checks.
6. `tests/Regression/learningPublicCourseDetailPrototype.test.mjs` - verify the restored previous course behavior.

## Verification
- The restored course page matches the Archive 8(1).zip file exactly (byte comparison).
- 200/200 runnable JavaScript regression checks passed (`node --experimental-strip-types --test`). One additional Activity Log UI guide test cannot start because `PM_Circle_UI_Style_Guide (4)(8).html` is absent from Archive 11.zip.
- Modified TSX files transpile with no syntax errors (global TypeScript).
- Terms CSS parses with no errors (tinycss2).
- `php -l routes/web.php` passed.
- A full production Vite build and a live browser screenshot comparison were not performed; Chromium screenshot attempts timed out here. Test locally using a compatible Node.js 22.18+ installation.

## Installation (local)
Back up your project. Extract the patch in the existing project root, preserving folders. Do not overwrite `.env`, the database, or uploaded media. Then:

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Verify `/terms`, `/learning`, `/learning/courses/{actual-course-slug}` and the member course page in desktop/mobile. No migrations or scheduled tasks needed. No production deploy was performed.
