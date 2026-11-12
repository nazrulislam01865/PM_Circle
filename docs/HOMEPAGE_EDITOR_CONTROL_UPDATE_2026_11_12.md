# PM Circle homepage editor refinements — 2026-11-12

## Requirements implemented

- Hero action labels and their corresponding destinations appear side-by-side on desktop (stack on smaller screens).
- Career pathway step fields are stacked, in the order title, description, built-in icon and optional uploaded icon.
- Optional PNG/JPG/WebP uploads (2 MB maximum) are supported for pathway step icons, exam-card icons, PM career feature-card icons, and the resume panel's small sparkle icon. Uploaded images display at 52 × 52 px without background, border, padding or margins. Built-in career/pathway/feature icons share the same plain 52 px footprint.
- The resume panel's document illustration (`pm-resume-illustration`) is unchanged.
- Daily-challenge View all / Read scenario / Join discussion labels and destinations can be edited. Leave a scenario-specific destination blank to keep the current scenario's dynamic destination.
- Community View all / Join to share labels and destinations can be edited; an empty Join destination retains the prior signed-in / guest behavior.
- Destinations offer existing same-site page suggestions but also allow a manually entered valid local GET route. External links, administration URLs and invalid paths are rejected by the Laravel Form Request.
- The manual community featured-post selector is removed. The public homepage now displays the latest two published public posts, in descending publication order; unpublished or private posts are not shown. A legacy `featured_ids` value cannot override this behavior.
- Homepage editor sidebar now provides separate **PM career feature cards** and **Opportunities & resume** sections, with separate visibility toggles. The existing `careers` content object is reused; previously hidden career content remains hidden when upgraded.
- Opportunities/resume CTA labels and destinations are paired. Existing master-data controlled feature destinations and icons remain supported.

## Architecture and security

- No database migration or dependency change. Existing `home_page_contents.content` JSON stores new optional fields; older records are normalized in the admin editor and retain their existing public defaults.
- Icon uploads reuse the existing admin-only `/admin/homepage/images` endpoint with image MIME and file-size validation, S3-compatible public disk storage, and existing CSRF handling. Server-side content rules accept only icon paths under the configured public homepage image directory.
- No additional queries on the public homepage. Removing manual featured posts removes an admin page posts-selection query.
- The document illustration and community engagement/reaction logic were not modified.

## Verification and local commands

PHP syntax checks passed for the modified PHP files and test file. TypeScript files passed syntax parsing with the locally available TypeScript compiler. Full Laravel feature tests and the Vite production build require `vendor/` and `node_modules/`, which are not included in the provided source archive.

From the project directory (using PHP 8.4+ and Node 24.11+):

```sh
composer install
npm ci
php artisan optimize:clear
php artisan test --filter=HomepageAdministrationTest
php artisan test --filter=HomepageMasterDataTest
npm run build
php artisan optimize
```

On a server, back up the database and `.env` first, never replace `storage/`, and run `php artisan storage:link` only if your public storage link is missing. Uploaded images require the public storage URL to be reachable. No migration or reseeding is required for these changes.

## Files

- `resources/js/pages/admin/Homepage.tsx` — grouped action pairs, route editor, new section controls and image fields
- `resources/js/components/admin/HomepageFields.tsx` — reusable route suggestion input and icon upload field for repeaters
- `resources/js/components/admin/homepage-sections.ts` — sidebar sections
- `resources/css/pm-admin.css` — form alignment and icon preview sizing
- `resources/css/pm-home.css` — 52 px plain display icons
- `resources/js/types/home.ts` — optional icon and route fields
- `resources/js/components/home/{HomeContentIcon,HomePathway,CareerHighlights,ScenarioPreview,HomeCommunitySection}.tsx` — public rendering
- `resources/js/pages/public/Home.tsx` — split career visibility
- `app/Http/Requests/Admin/UpdateHomepageRequest.php` — validated paths and image fields
- `app/Http/Controllers/Admin/HomepageController.php` — compatibility defaults and automatic feed configuration
- `app/Http/Controllers/PublicSite/HomeController.php` — latest-public-post selection
- `database/seeders/HomePageContentSeeder.php` — default section visibility and upgrade safety
- `tests/Feature/Admin/HomepageAdministrationTest.php` — route, upload, visibility, feed regressions
