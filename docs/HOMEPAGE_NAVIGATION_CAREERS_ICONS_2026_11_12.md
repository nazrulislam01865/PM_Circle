# PM Circle — Homepage editor, navigation, icons and Careers preview

Date: 2026-11-12

## Changes

1. The homepage editor uses the existing shared `PMDropdown` for every native select, including published scenario selection and built-in icon choices. Destination fields support both a writable same-site path and a styled dropdown of suggested paths. There are no native HTML selects in the homepage administration form.
2. Skills Sidebar cards now support individually uploaded icon images, just like career pathway and career feature items. Image uploads use the already-authorized `/admin/homepage/images` endpoint and require PNG/JPEG/WebP, maximum 2 MB. Uploaded icons render at 36 × 36 px with no surrounding background, margin, border or padding. When no uploaded image is present, the built-in Lucide icon is used.
3. Global icon uploads have been removed from the Master Data interface and routes. Existing master-data records and uploaded files are preserved, but global icon overrides are no longer read by the public homepage. To customize an icon, upload it to the individual item in Homepage control.
4. The homepage Latest opportunities panel now loads **up to three current jobs** from the same `career_jobs` table, freshness scope, and newest-first order used by `/careers`. Each item opens `/careers/{slug}`. The old sample cards and their toggle no longer affect the public display; their existing saved JSON is retained for backward compatibility. If no current jobs exist, the configured empty-state message is shown.
5. Navigation Control now has only **Header menu** and **Footer menu**. Both categories allow safe internal destinations, editable labels, ordering and active/inactive status, and feed the public shared header/footer. Navigation defaults are seeded once; rerunning the seeder does not recreate a destination changed by an administrator.
6. The document illustration within the Resume banner is unchanged.

## Storage and database

- **No migration** and no destructive database operation required.
- Reuses `master_data_options` for `header_menu` and `footer_menu`, with an idempotent seeder.
- Individual icon image URLs are stored in the existing `home_page_contents.content` JSON.
- Existing icon files and retired master option rows are not deleted.

## Local verification

Completed against uploaded source:
- PHP 8.4 lint: all modified PHP files passed.
- TypeScript syntax parsing: all modified TS and TSX files passed.
- Added/updated feature tests cover admin menu management, URL safety, caching, icon uploads, and live Careers preview.

Full PHPUnit execution, production frontend build and browser UX testing must be performed in your configured PM Circle environment because this archive does not include `vendor` or `node_modules`.

## Apply on local macOS

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
php -v
node -v
php artisan optimize:clear
php artisan db:seed --class=HomepageMasterDataSeeder
php artisan test --filter=HomepageAdministrationTest
php artisan test --filter=HomepageMasterDataTest
php artisan test --filter=HomepageCareersTest
npm run build
php artisan optimize
```

Use PHP >=8.4.1 and a supported Node release (Node 24.11+ recommended). The `php artisan test` command requires Composer development dependencies (`composer install` without `--no-dev`) and a separate testing database. Preserve `.env`, existing database data, `storage`, and the public storage symlink during deployment. For production, back up the database and run the seeder as the application owner using your production PHP binary; use `--force` only after confirming the environment and backups.
