# PM Circle: homepage admin navigation and master data

## Scope

This revision changes only administrator homepage navigation, layout, and dropdown data sources. The public homepage, member dashboard, other modules, and existing homepage JSON content are not redesigned.

- The **Homepage control** navigation item expands to seven submenus: Hero & portraits, Career pathway, Daily challenge, Community feed, Member preview, Skills sidebar, and Career highlights.
- Switching a submenu updates only the current editing panel; unsaved field values remain in React state. Opening `/admin/homepage?section=skills` directly selects the requested section. Saving maintains the selected section.
- The duplicate section list inside the editor is removed. The editor and header now stretch across the available administrator content width, using the established PM Circle design tokens.
- **Master data** is a separate, administrator-only page at `/admin/master-data` for option labels, display order, activation, and safe additions.

## Architecture and safeguards

- `master_data_options` stores category, immutable value, label, sort order, and active status with a composite unique key and an efficient category/status/order index.
- Existing dropdowns for hero destinations, pathway/exam/skill/career icons and destinations use active master-data records. The sample job location and employment type fields are also converted to dropdowns backed by master data.
- Existing scenario, post, and member selectors continue reading their live eligible records. They are not replaced with static options.
- `HomepageMasterData` centralizes supported groups, editor options, request validation, safe route checks, and usage checks. Each homepage form load or save requires one indexed master-data query, not a query per item.
- Only administrator accounts can read or change master data; public users cannot access these endpoints.
- Unsupported icons and external/admin URL destinations cannot be added. Active options that are currently used on the homepage cannot be disabled. Retiring an unused option does not delete its record.
- The seeder is idempotent. It never overrides existing labels, order, or status. It additionally imports previously saved custom opportunity locations/types so upgrades do not lose those values.

## Changed areas

- Admin: `resources/js/layouts/admin/AdminLayout.tsx`, `resources/js/pages/admin/Homepage.tsx`, `resources/js/pages/admin/MasterData.tsx`, `resources/js/components/admin/{HomepageFields.tsx,homepage-sections.ts}`, `resources/css/pm-admin.css`.
- Laravel: `app/Models/MasterDataOption.php`, `app/Support/Admin/HomepageMasterData.php`, `app/Http/Controllers/Admin/{HomepageController.php,MasterDataController.php}`, `app/Http/Requests/Admin/{UpdateHomepageRequest.php,StoreMasterDataOptionRequest.php,UpdateMasterDataOptionRequest.php}`, `routes/web.php`.
- Data: new `2026_11_11_000003_create_master_data_options_table.php`, `database/seeders/HomepageMasterDataSeeder.php`, and `DatabaseSeeder.php` registration.
- Tests: existing `HomepageAdministrationTest.php` updated to seed the catalog; new `HomepageMasterDataTest.php` checks permissions, data access, routing, safe options, and option deactivation.

## Deployment (with database backup)

1. Back up the PostgreSQL database and `.env` according to your normal procedure.
2. Review the SQL with `php artisan migrate --pretend` and then run `php artisan migrate --force` once during an authorized deployment.
3. Run `php artisan db:seed --class=HomepageMasterDataSeeder --force`. This seeds only missing records. Do **not** run `migrate:fresh`.
4. Use Node.js 22.18+ (or an explicitly supported newer version), then run `npm ci`, `npm run types:check`, and `npm run build`.
5. Run `php artisan test --filter=HomepageAdministrationTest` and `php artisan test --filter=HomepageMasterDataTest`.
6. Clear Laravel caches using `php artisan optimize:clear`; rebuild caches only after ensuring writable directories and correct ownership.
7. Test `/admin`, `/admin/homepage`, `/admin/homepage?section=careers`, `/admin/master-data`, and the public homepage in a browser as administrator and ordinary member. Verify mobile layouts, submenu state, saves, errors, and active-option handling.

## Verification limits in the packaging environment

PHP syntax validation and TypeScript TSX syntax transpilation passed. This environment has no installed Composer vendor tree and npm dependency installation timed out with an unsupported Node.js minor version. Consequently Laravel feature tests, full TypeScript type checks, production frontend build, and browser visual QA are **not** claimed to have passed here. These checks are required before production release.
