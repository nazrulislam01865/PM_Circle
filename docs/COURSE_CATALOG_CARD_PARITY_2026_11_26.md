# Browse Courses card parity

The prior dynamic course management update removed demo rating and learner metrics. Cards only rendered the review row when a published review existed, creating a visual difference from the prototype. The prototype also uses a different typeface; the approved Inter design system remains authoritative.

## Changes
- Preserve four desktop cards, 16:10 covers, responsive column reductions, equal card heights and aligned View details actions.
- Use the guide's 14px card radius, 16px card gap and 12px inner spacing; keep the guide's 18px title, 16px body, 14px metadata/control roles and shared 44px button.
- Restore the metadata row with actual published-review average and unique course enrollment count. Without published reviews the row says No reviews yet. No sample ratings or invented enrollments are introduced.
- Aggregate enrollments in a grouped subquery joined to the existing catalog query; no per-card queries, extra query round trips, schema changes or new dependencies. The existing user/course uniqueness constraint makes the count a count of enrolled accounts. Other consumers of catalogData and the course detail page are unchanged.

## Verification
- Updated regression suite: 493/495, original: 492/494. Both failures occur on the original (PMP dashboard and legacy profile header).
- PHP syntax and TypeScript transpilation passed. Chromium representative card fixtures using project CSS and the embedded approved Inter faces passed at widths 1440, 1100, 850, 700, 390px; checked column count, image ratios, overflow, typography, card radius and desktop button alignment.
- Added a Laravel feature test for real enrollment count and published-only review aggregates. Not run: Composer/vendor dependencies unavailable. Full build/type check and authenticated browser execution not run; npm dependencies not installed.

## Deployment
Preserve .env, database and private storage. Install dependencies and run npm run types:check, npm run build, php artisan optimize:clear and php artisan optimize. Run php artisan test --filter=CourseDynamicManagementTest on an isolated test database. No migration or seed is necessary for this change (previous migrations still required).
