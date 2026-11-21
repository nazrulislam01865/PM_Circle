# PM Circle — Public homepage typography, post/reactions, and search alignment

Date: 2026-11-21
Source: Archive 3(6).zip
Visual reference: supplied full-page and section-by-section screenshots of the homepage prototype.

## Root causes corrected

- The homepage used `min(70.2vw, 90rem)` at large sizes but switched to almost full-screen width below 1500px, changing card widths, line wrapping and proportions. Desktop now keeps the centered approximately 70.2vw content rail; tablet and mobile rules are still separate.
- The desktop section-heading clamp had a smaller viewport slope than the reference. The homepage-only centralized font-size token was adjusted. The global font remains Inter, which is **already loaded** in `resources/views/app.blade.php` from Google Fonts.
- Exam and course card minimum content heights were inconsistent with the supplied desktop reference; these were adjusted in the scoped homepage CSS.
- The sample posts and scenario used simplified, non-interactive action text. Sample actions now reuse the shared reaction picker and action bar without attempting any fake POST requests. Published posts continue using the existing `PostEngagementActions` API, moderation-safe `PostContent` and admin-uploadable reaction icons.
- Cards clipped the upward-opening reaction picker. Homepage V2 post/scenario cards now allow popup overflow and lift during hover/focus.
- The header's basic page search was extracted into a small component and uses existing, validated GET search filters for community posts, scenarios, members and jobs. No global search table, new query service or migration was introduced.
- The supplied source archive omitted runtime-directory `.gitignore` placeholders; these are restored to prevent the Laravel compiled-view path failure.

## Files changed

- `resources/css/pm-design-tokens.css` — homepage-only section-heading font token
- `resources/css/pm-home-v2-layout.css` — card sizing and accessible search panel styling
- `resources/css/pm-home-v2-sections.css` — feed/sidebar proportions and V2 interaction rails and popover overflow
- `resources/css/pm-home-v2-responsive.css` — responsive content width correction
- `resources/js/components/home/v2/HomeHeader.tsx` — integration of reusable header search
- `resources/js/components/home/v2/HomeSearch.tsx` — new small route-backed search component
- `resources/js/components/home/v2/PreviewEngagementActions.tsx` — new non-mutating sample action component
- `resources/js/components/home/v2/HomeCommunity.tsx` — shared scenario action styles and picker
- `resources/js/components/community/PostCardV2.tsx` — unified live/preview action rail
- `resources/js/components/community/PostEngagementActions.tsx` — optional homepage-only React caption; existing default unchanged
- `resources/js/components/home/HomeEngagement.tsx` — optional reaction button caption, preserving existing defaults and API
- `tests/Regression/publicHomepageV2.test.mjs` — regression coverage for typography, search, preview actions
- `storage/.../.gitignore`, `bootstrap/cache/.gitignore` — safe empty Laravel runtime directories

## Preserved

Controllers, database schema, authentication, permissions, moderation, reaction authorization, admin-managed content, course visibility, and other page layouts were not altered. Sample posts do not write to fake IDs. All visual CSS changes are homepage-scoped, except for a homepage-only token in the centralized design-token file.

## Verification performed

- Node static regression suite: **163 passed, 0 failed** (with `--experimental-strip-types`).
- TypeScript isolated syntactic transpilation: **7 changed TSX files passed**. (Full typechecking requires npm dependencies.)
- CSS parsing: **4 modified stylesheets parsed without errors**.
- Full production build: **not verified** in the execution environment; `node_modules` and Composer vendor dependencies are absent.
- Pixel comparison: **not verified**. The live prototype URL cannot be resolved from this environment; headless Chromium rendering also failed. The supplied screenshots were the visual reference. Do not interpret source-only tests as a pixel-perfect comparison.

## Build and deployment (on local Mac with working PHP/Postgres env)

Use supported Node 24 LTS or 22.18+:

```sh
nvm install 24
nvm use 24
npm ci
php artisan wayfinder:generate --skip-database --with-form
npm run types:check
npm run build
php artisan optimize:clear
```

If Wayfinder fails, run its Artisan command separately and resolve the first reported Laravel exception. The ZIP intentionally excludes the **stale compiled** `public/build/` assets from its previous revision; build new assets before previewing or deploying. No migrations are needed for these frontend changes. Do not replace production until the updated `public/build` and page have been verified against reference screenshots in desktop and mobile viewports.
