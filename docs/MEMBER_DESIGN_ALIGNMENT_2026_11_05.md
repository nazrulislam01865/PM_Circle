# PM Circle — Member Design Alignment (5 November 2026)

## Source of truth

- Updated project: `Archive 2(5).zip` supplied by the project owner.
- Profile prototypes bundled in `pmDoc/p1.png` (Edit profile), `pmDoc/p2.png` (Resume & imports), `pmDoc/p3.png` (Overview).
- Dashboard and learning references: user-supplied `pro1.png` through `pro5.png` plus current rendered screenshots.
- Existing shared PM Circle layout, design tokens and approved blue brand.

## Root causes and corrections

| Area | Existing problem | Correction |
| --- | --- | --- |
| Profile overview | `max-width: 1200px` plus 24px nested padding made the profile much narrower than the member workspace | Uses the same content padding and responsive width as Dashboard and Learning |
| Profile hero | 180px cover, 110px avatar and stacked name displaced the content | 102px cover, 144px overlapping avatar and side-aligned name matching p3 proportions |
| Profile cover | Remote Unsplash image rather than approved skyline design | Local, cropped, lightweight WebP asset from supplied `p3.png`, while keeping custom cover uploads intact |
| Profile sections | Excessive card padding and 24px gaps | Compact 16px/18px card padding and 12px vertical gaps; consistent right column |
| Edit profile | Dashed upload zone and small square avatar differed from p1 | Cover and avatar editor adjusted to p1; upload actions retained |
| Profile tab headings | Header changed its name instead of staying `My profile` as in p1–p3 | Shared profile heading with per-tab supporting copy |
| Header actions | Different button copy/styles | Unified tokens; import header now uses Cancel and Save changes |
| Shared design system | Member controls, content widths and fonts were separately hard-coded | Common member font, card, button, spacing and content inset variables in `pm-dashboard-shell.css`; profile and learning consume them |
| Sidebar active state | `My profile` and `Settings` could be active together | Settings now targets Security and routes are classified independently |
| Settings | Security and Appearance pages used starter-kit layout, breaking navigation consistency | Both use the `MemberDashboardLayout` with a reusable member settings frame |
| Public profile preview | Placeholder alert; a private owner couldn't see their preview | Owner can see their own safe projection; other viewers remain excluded by visibility controls |
| Profile marketing claim | Unverified `3x more reviews` assertion | Uses p3 wording about completing a work sample |

## Modified / added files

- `resources/css/pm-dashboard-shell.css`: centralized member tokens, controls, settings frame.
- `resources/css/pm-dashboard-responsive.css`: responsive shared inset variables.
- `resources/css/pm-learning-core.css`: common content inset, right column geometry, headings.
- `resources/css/pm-learning-responsive.css`: consistent responsive member gutters.
- `resources/css/pm-profile.css`: prototype layout and responsive profile media.
- `resources/js/app.tsx`: no second starter-kit layout on authenticated Settings screens.
- `resources/js/components/dashboard/DashboardSidebar.tsx`: no duplicate active item.
- `resources/js/components/dashboard/MemberSettingsPage.tsx`: reusable account settings frame.
- `resources/js/pages/settings/profile.tsx`: profile prototype layout, cover/edit actions, badge projection and preview.
- `resources/js/pages/settings/security.tsx` and `resources/js/pages/settings/appearance.tsx`: shared member frame.
- `app/Http/Controllers/Settings/ProfileController.php`: minimal profile ID used for own public preview.
- `app/Http/Controllers/Members/MemberDirectoryController.php`: owner-only private profile preview; public ACL preserved.
- `tests/Feature/Members/MemberDiscoveryTest.php`: owner/private profile access regression.
- `public/images/pm-profile-city-cover.webp`: lightweight fallback artwork cropped from the supplied profile reference.

## Database and security impact

No schema migrations. No changes to plan/payment rules, login/signup, or existing records. Owner-only member preview does not make the profile public; private profiles remain hidden in directory and to other viewers. Existing avatar/cover upload actions remain wired to their previous handlers.

## Verification

Passed: PHP syntax on modified controller/test files. TypeScript parser: 257 TS/TSX files, no syntax errors. Local alias/relative import resolution: 508, none missing. CSS braces balanced. ZIP CRC integrity checked at packaging.  Browser screenshot fixture attempted but did not finish in this environment; therefore full pixel-by-pixel browser matching is **not verified**. `npm ci` timed out and the available Node 22.16 is below the minimum Node 22.18 required by the checked-in Vite Plus package. Production frontend compilation and Laravel feature tests must be executed on the developer's Mac with supported Node and installed Composer dependencies.

## Local verification and deployment (GitHub backend + local rsync frontend)

1. Back up your local project; apply this patch or replace source from the full archive, preserving `.env` and user-uploaded files.
2. Run `npm ci && npm run types:check && npm run build` with Node >=22.18.
3. Run `php artisan test --filter=MemberDiscoveryTest`; check `/dashboard`, `/learning`, `/learning/student-beginner`, `/settings/profile` tabs `overview`, `edit`, `imports`, `privacy`, `/settings/security`, `/settings/appearance` on desktop/tablet/mobile.
4. Push the matching source commit to GitHub. On DigitalOcean, back up the database before pulling; `git pull --ff-only origin main`, `COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader` and `php artisan optimize`.
5. Upload **only** `public/build/` from the Mac: `rsync -avz --delete public/build/ root@103.253.147.113:/var/www/pm-circle/public/build/`.
6. `php artisan queue:restart` and reload PHP-FPM as appropriate. No migration or demo re-seeding needed.

The full archive contains source, not `node_modules`, `vendor`, production `.env`, sessions or generated Vite build files. Empty Laravel runtime directories should be created as needed in deployment.
