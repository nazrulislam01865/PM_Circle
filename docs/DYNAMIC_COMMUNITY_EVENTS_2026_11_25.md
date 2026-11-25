# PM Circle — Dynamic community events (2026-11-25)

## Source analysis
The supplied `Archive(1).zip` contains the existing public event catalog, detail prototype, shared public/member/admin shells, central guide CSS and `PM_Circle_Design_Guidelines (1).html`. The listing previously came from `PrototypeEventCatalog`; detail sections were hard-coded for one featured slug; homepage creation, registration and discussion were local React state. The supplied project has no persisted event module. Existing event design and routing were retained, but fictional records are not promoted to real bookings.

## Implemented workflow
- `/events` reads published upcoming events, with server-side search, format, ordering and 10-per-page pagination. The homepage reads only the next 3 published events when its existing events section is enabled. Both use the real detail URL. No N+1 event reads.
- `/events/create` requires the existing authenticated, active member, verified-email (according to existing configuration), and completed-onboarding middleware. Members submit pending events and see their own submissions/status. Guests are redirected by the existing authentication flow. Admins create/edit through `/admin/events`.
- Admin review supports publish, unpublish and reject, and marks sponsors; member requests cannot set publication or sponsored flags. No destructive event deletion is offered. Public detail URLs only resolve published events. Unpublishing retains registrations and comments.
- Shared event editor supports title, category, summary, full description, Bangladesh start/end times, format, organizer, venue/address, optional cover/map image, repeatable agenda and speakers, guest/member registration and public discussion flags. The event timestamp is persisted in UTC; display uses Asia/Dhaka. Uploaded JPG/PNG/WebP files are bounded to 5 MB and 6000px per dimension. Optional media is hosted on the existing public disk, intended for publication. Do not upload confidential material.
- Registration is free, open only before the start time and when enabled. Guests may register for open events; member-only registration requires an eligible member. Member identity is derived on the server; registration data is private and visible only through the existing administrator gate. Unique event/email and event/member constraints prevent duplicates. A verified member can associate an earlier guest registration for their own email. Guest email ownership is **not** verified; a registration acknowledgment is not an email confirmation. No payment, capacity, attendance check-in, email campaign, meeting-link automation or subscription restriction was invented.
- Public comments are rate-limited and saved pending administrator moderation. Only approved comments are shown. Guest display names and comment content are public upon approval; member identity is server-derived. Related events come from the same category (up to two published upcoming events). The map link uses the stored venue/address; optional uploaded map preview is not a live embedded map.
- Admin page settings use the existing `home_page_contents` table with isolated key `events`. Admin can configure listing banner copy, host promotion copy/label/visibility and up to ten ordered company advertisements (HTTPS image and destination URL, company, initials, category, title, description, action). The host contact destination is intentionally the existing `/contact` route. Empty advertisements hide the carousel. No demo ads/events/comments are seeded.
- Existing PublicLayout, MemberDashboardLayout, AdminLayout, EventBanner, EventAction, EventListingRow, shared pagination, central `pm-guide-*` and `pm-admin-*` classes are reused. CSS additions are scoped to event/editor layout and use central typography and spacing variables. No packages added.

## Database impact
`2026_11_25_000001_create_community_events.php` adds `community_events`, `community_event_registrations`, and `community_event_comments`. Foreign keys and event/email and event/user unique indexes; event publication/start/category/creator and comment moderation indexes. No existing table columns removed or modified. Page settings use an existing table/key. Migration creates empty tables; do not run migrate:fresh or seed sample events into production.

## Changed paths
- `app/Models/CommunityEvent.php`
- `app/Domain/Events/{EventPageContent,EventWriter}.php`
- `app/Http/Requests/Events/SaveEventRequest.php`
- `app/Http/Controllers/PublicSite/{EventPreviewController,HomeController}.php`
- `app/Http/Controllers/Admin/CommunityEventController.php`
- `routes/web.php`, `bootstrap/app.php` (event routes and inline Inertia throttle handling)
- `database/migrations/2026_11_25_000001_create_community_events.php`
- `resources/js/components/events/{EventComponents,EventEditor}.tsx`, `eventTypes.ts`
- `resources/js/pages/events/{Index,Show,Create}.tsx`
- `resources/js/pages/admin/{Events,EventEditor,EventParticipants,EventSettings}.tsx`
- `resources/js/layouts/admin/AdminLayout.tsx`
- `resources/js/pages/public/Home.tsx`, `resources/js/components/home/v2/{HomeEvents.tsx,reference.ts}`
- `resources/css/pm-events.css`
- `tests/Feature/Events/CommunityEventTest.php`, `tests/Regression/{publicEventsPrototype,publicHomepageV2}.test.mjs`
- Removed unused `app/Support/Events/PrototypeEventCatalog.php` and homepage static event list. Older generated Wayfinder files are regenerated by the normal build process; no frontend uses the stale generated event actions.

## Verification and limits
- PHP lint on all 11 changed/new PHP files (including the new feature test): passed.
- TypeScript transpile/syntax check for 14 changed/new TS/TSX files: passed (not a full project typecheck).
- CSS parse/token validation: passed.
- Full existing plus updated source-level JS regression suite: 348/348 passed.
- Laravel feature tests added for visibility, search, duplicate registration, member-only and closed events, validation, comment approval and admin access; not run here because the supplied archive lacks vendor dependencies and Composer is unavailable.
- Full frontend dependency installation, type-check, Vite build, database migration, PostgreSQL concurrency tests and visual/browser verification are not completed in this environment. Do not claim production-ready deployment before these checks.

## Apply locally
Use an existing project checkout, preserve `.env`, database and storage. The delivered archive contains source, not a newly built `public/build`. Use the project's supported Node.js version (at least 22.18 for the supplied toolchain) and installed PHP/Composer versions.

```bash
composer install
npm ci
php artisan optimize:clear
php artisan migrate
php artisan storage:link # only if public/storage is absent
npm run types:check
npm run build
php artisan route:list --path=events
php artisan test --filter=CommunityEventTest
node --experimental-strip-types --test tests/Regression/*.test.mjs
```

Before live deployment back up the production database and existing files, run the additive migration and rebuild assets, preserve server .env and storage, then verify administrator event creation/publication and member/guest registrations. Existing runtime caches, sessions, Inertia devtools snapshots, stale compiled assets and dependency folders are excluded from the archive. No deployment was performed.
