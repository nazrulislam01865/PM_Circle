# Homepage prototype implementation (2026-11-05)

Scope: The public `/` homepage only. Existing header/footer, member dashboard, authentication, permissions, and other pages remain unchanged.

## Source of truth

- `resources/js/pages/public/Home.tsx` renders the provided homepage reference using existing `PublicLayout`, `TopicPills`, `SectionHead`, `Avatar`, and modular homepage components.
- `resources/css/pm-home.css` contains **homepage-scoped** adjustments; shared colours, font, spacing and button tokens stay in `resources/css/pm-circle.css` and the supplied UI design system.
- `home_page_contents` stores the prototype's marketing copy, cards, skill choices, sample job cards, portrait references, and illustrative statistics as JSONB under unique key `home`. The `HomePageContentSeeder` inserts the starting content once and **does not overwrite later changes**.
- Existing `scenarios`, `scenario_responses`, `posts`, `users`, `profiles`, and learning tables provide scenario, discussion, member and real-activity data. `/` does not issue queries per card. Public profile visibility is respected.
- `DemoHomePageSeeder` creates fictional members and two homepage posts, with bundled portrait paths, only in local/testing if `PMC_DEMO_CONTENT_ENABLED=true`; it is idempotent and never creates known login passwords. Local illustrative statistics and scenario engagement counts come from `home_page_contents`, not hardcoded JSX. These are explicitly labelled as illustrative.
- In production, fabricated statistics and demo opportunities are not presented as live. Live counts come from public/active member profiles, completed learning activity minutes and scenario responses. A real jobs model does not exist yet, so job totals remain 0 and sample job cards are hidden in non-demo mode.

## Run on local Mac / XAMPP

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views
chmod -R u+rwX bootstrap/cache storage
composer install --no-interaction
php artisan migrate
php artisan db:seed --class=HomePageContentSeeder
php artisan db:seed --class=DemoScenarioSeeder
php artisan db:seed --class=DemoCommunitySeeder
php artisan db:seed --class=DemoHomePageSeeder
npm ci
npm run types:check
npm run build
php artisan test --filter=HomePageContentTest
```

Set `PMC_DEMO_CONTENT_ENABLED=true` in local `.env` to show the illustrative prototype content, and use `php artisan config:clear` after updating it. These seeders will not overwrite user accounts and the homepage demo accounts use non-deliverable `.invalid` domains. The three targeted demo seeders above avoid invoking the unrelated profile-enrichment seeder. The existing standard `php artisan db:seed` workflow still runs the original local-only profile seeder as before.

## Production deployment

Take a database backup first. Deploy the updated code using your normal release procedure, then run:

```bash
php artisan migrate --force
php artisan db:seed --class=HomePageContentSeeder --force
npm ci
npm run build
php artisan optimize:clear
```

Do not run local-only demo seeders on production or represent their generated example data as real members and job opportunities. Existing public content remains visible. No destructive migration, schema rename or production data reset is required.

## Verification

Tests are included at `tests/Feature/PublicSite/HomePageContentTest.php` to cover database-backed copy and figures, safe idempotent demo seeding, and disabled demo mode. Run them with installed Composer dependencies and the project's PostgreSQL/SQLite-supported test configuration. The source archive does not bundle `vendor` or `node_modules`, so those dependencies must be installed in the target development environment.

**Node compatibility:** The project's Vite Plus 1.4 toolchain requires Node 22.18+ (or 24.11+/26+), not Node 22.16. If `npm run build` fails with an engine warning, upgrade Node locally first.
