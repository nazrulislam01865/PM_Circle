# Profile Overview — Latest badges card

Based on Archive 9(1).zip and the supplied profile overview screenshot.

- Move the existing Latest badges panel from the main column to the right sidebar, directly after Profile completeness and before Profile reward. Do not duplicate it.
- Add a compact `profile-rail` variant of `LatestBadgeCards`, retaining the original achievements-page panel. Reuse `BadgeMedal`, the existing tier and palette definitions, and `achievementDate` (Bangladesh time).
- Render the three latest genuinely earned badges from the existing `profileData.latest_badges` payload. Preserve server order; omit unknown dates rather than inventing them. Render an empty state if none are earned.
- Use the existing card surface, semantic type roles, shared outline button and central design tokens. Three equal columns with wrapping; no separate tile border. Link to `/dashboard/features/achievements`.
- No controller, query, migration, entitlement, or other profile section changes.

## Verification

- Targeted source regression tests: 14/14 pass (including 3 new tests).
- Full source regression suite: 435/436 pass. The unrelated existing full-mock counter assertion remains failing.
- TypeScript syntax transpilation: both modified TSX files pass.
- Isolated rendered component fixture checked in Chromium at 320, 390, 480, 700 and 1440 viewport widths; three-column layout and no horizontal overflow. Empty, one-badge, mixed and unknown-date fixtures pass. Fixture uses actual component markup and styles with mocked Inertia and decorative Lucide icons, not a running Laravel page.
- Full dependency installation and production build not verified: offline npm cache misses yuku-parser and local Node 22.16 is below the package minimum of 22.18. No Laravel vendor directory in the source archive.

## Apply

Extract the full project or overlay the patch while retaining your existing .env, database and storage. The full source archive excludes stale compiled public/build files; build before serving. Use a supported Node version (22.18+ within Node 22, or a supported Node 24 release), run `npm ci`, `npm run types:check`, `npm run build`, and `php artisan optimize:clear`. Check `public/build/manifest.json` before opening the profile. No database migration or seeder required.
