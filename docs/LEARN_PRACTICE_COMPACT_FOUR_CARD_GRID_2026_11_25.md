# Learn & Practice: compact four-card catalog

Base: PM_Circle_Learn_Practice_Shared_Prototype_Full_Project.zip. The user requested the compact right-hand card reference and four equal-sized cards per row for public and member catalogs.

## Changes
- Shared PublicCourseCatalog: four courses per page. Both shells continue using the same tile and pagination component. Filters, details links, recommendation flow, and course data query remain unchanged.
- Compact card style: centralized H4 size (16px), bold weight, 14px description and metadata, tighter line height and spacing, smaller central radius, soft outline border. Image remains 16:10 with object-fit cover. Keep approved Inter and the shared 44px accessible button height.
- Four columns for content rails above 53.125rem, two columns below that, one column at 28rem and below. Equal grid tracks and equal row heights except single-column mobile, where natural heights prevent extra whitespace. Card text remains accessible and is not truncated.
- Existing view-only sample rating map now recognizes the course titles and example values shown in the approved prototype; these remain labeled sample data. Courses without matching entries show no invented ratings. No database change.

## Verification
- 6/6 catalog source regression tests passed; 402/403 full Node regression tests with --experimental-strip-types passed (same existing full mock counter assertion fails in base, 401/402).
- 12/12 offline Chromium fixtures: public/member at widths 1600, 1440, 1024, 768, 390 and 320. Computed type roles, 44px controls, four cards per page, card bounds, row button alignment and no outer horizontal overflow verified. Fixtures transpile the actual shared TSX using a lightweight mock of React/Inertia; they are not a live authenticated Laravel run.
- Production build/typecheck and real browser integration not verified: project dependencies are not installed; local Node is 22.16.0, below Vite Plus requirement.

## Deployment
Extract patch into existing root, retain .env and storage. Run npm run types:check, npm run build, php artisan optimize:clear. No migration or reseeding needed. Verify /learning and /dashboard/learning?tab=courses.
