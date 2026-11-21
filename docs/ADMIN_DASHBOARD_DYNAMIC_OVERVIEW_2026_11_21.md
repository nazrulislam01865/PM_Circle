# PM Circle — Admin Dashboard (21 November 2026)

## Scope

This revision replaces only `/admin` (admin Overview) with the supplied dashboard composition: six KPIs, platform activity, engagement mix, quick actions, recent recorded updates, system information, interview preparation snapshot and pending moderation tasks. The existing sidebar, page routing, authorization and central Rajdhani font/design tokens remain the source of truth.

## Dynamic metrics

- **Total Members:** active non-admin accounts, all-time; change represents *new* active accounts compared with the preceding period.
- **Active Learners:** distinct members with course enrollment, learning completion or a course-practice attempt during the selected reporting period. No course enrollment is inferred from browsing.
- **Interview Question Sets:** active interview question sets; change reflects new active sets compared with the preceding period.
- **AI Requests Today:** requests created today (UTC), including queued and failed attempts. Comparison is against yesterday, and not affected by the 7/30/90-day filter.
- **Community Posts:** published public, nondeleted posts, all-time; change reflects newly created published public posts compared with the preceding period.
- **Course Enrollments:** total persisted course enrollments; change reflects new enrollments compared with the preceding period.
- **Activity chart and engagement mix:** bounded aggregates of recorded public posts, scenario responses, course enrollments and learning completions, PMP attempts, and interview sessions. The **Members** toggle charts new active non-admin accounts. All dates use UTC for consistent database reporting.
- **Recent activity:** limited real rows from interview questions, reviewed post reports, course updates and homepage updates. No fabricated audit records.
- **Upcoming tasks and header badge:** pending post reports, pending post reviews and pending comment reviews.
- **System information:** configured queue driver, configured AI features, and currently active subscription plan counts. **Worker availability, API health and backup health are unmonitored** and therefore never displayed as verified healthy.
- **Interview snapshot:** real totals for question sets, questions and active question types / answer modes from central Master Data. Recent import count shows **Not tracked** because no persisted import-history table exists.

All aggregate calculations use the database (no full-table Eloquent hydration), limit recent events, cache the overview for 60 seconds, and reuse existing indexes where available. No schema or new dependencies were added.

## Interactions

- Date filter: last 7 / 30 / 90 days; invalid input safely defaults to 7.
- Chart activity/new-member toggle with hoverable data points.
- Quick actions navigate to existing authorized pages; Add Question Set and Import Questions select the correct Interview Preparation tab.
- Search icon searches available administrator page destinations without database queries.
- Pending-work icon opens existing moderation management, and account dropdown offers View website / Sign out.
- Responsive grids collapse across tablet/mobile breakpoints.

## Affected files

- `app/Domain/Dashboard/Queries/AdminDashboardOverview.php` — bounded, cached data projection.
- `app/Http/Controllers/Admin/DashboardController.php` — validated timeframe and Inertia page response.
- `routes/web.php` — routes `/admin` to the new read-only controller within existing admin middleware.
- `resources/js/pages/admin/Dashboard.tsx` — screen layout and action wiring.
- `resources/js/components/admin/dashboard/{DashboardCard,MetricCard,ActivityChart,EngagementMix}.tsx` — reusable pieces.
- `resources/js/types/admin-dashboard.ts` — typed response shape.
- `resources/js/layouts/admin/AdminLayout.tsx` — opt-in dashboard-only topbar/search/avatar and optional heading action.
- `resources/css/pm-admin-overview.css` — scoped responsive styles; references existing centralized tokens.
- `resources/css/app.css` — imports dashboard stylesheet.
- `tests/Feature/Admin/AdminDashboardOverviewTest.php` and `tests/Regression/adminDashboardOverview.test.mjs` — regression coverage.

## Installation and verification

No migrations or seeders required for this change, assuming the previously shipped Interview Preparation and Learning migrations have already been applied.

```sh
composer install --no-interaction
php artisan migrate:status
npm ci
npm run build
php artisan test --filter=AdminDashboardOverviewTest
node --test tests/Regression/adminDashboardOverview.test.mjs
php artisan optimize:clear
```

Use **Node 22.18+** for this project's Vite Plus dependency. The source ZIP may still contain the previous `public/build` artifacts; regenerate them before deployment. Do not overwrite production `.env`, media, or session storage. No live services have been changed.
