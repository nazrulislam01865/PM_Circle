# PM Circle — Community post card consistency (2026-11-12)

## Scope

Keep the existing logged-in member header, community routes, post permissions, cursor loading, comments, polls and server-side reactions. Reuse the existing post interaction endpoints; add no new database queries, migrations, dependencies or routes.

## Changes

- `PostCard.tsx` is the canonical author/body/actions card for the authenticated dashboard, `/community`, the public homepage community preview and `/posts/{id}`. The detail mode uses the same card controls but keeps the existing dedicated comments section rather than opening inline comments.
- `DashboardFeed.tsx` converts its existing dashboard projection into the shared post shape in memory. Existing pagination and callbacks remain unchanged.
- `HomePostPreview.tsx` renders `PostCard` instead of an alternate card markup. Guest reactions/saving still prompt to join; published posts remain readable.
- `PostShow.tsx` uses the same post card, retaining the full detail page, comment sort, composer and side panels for signed-in members and guests.
- `PostSidebar.tsx` receives the already-loaded public author avatar and, for non-anonymous members, provides the existing public member-profile link. Anonymous authors still expose no member ID.
- `pm-unified-post-card.css` centralizes post-card dimensions, author/text alignment, engagement button spacing, selected reaction colors, and mobile behavior. Its action metrics also apply to existing scenario/action-row callers of `EngagementActionBar`.
- `PostCardPresentationTest.php` adds an HTTP-level regression check for avatar projection in feed and post detail, plus private visibility protection.

## Verification completed in packaging environment

- PHP syntax check of new feature test passed.
- Modified TSX files passed the TypeScript parser.
- Shared stylesheet and stylesheet imports passed PostCSS parsing.
- No dependency installation in the uploaded archive: full application build and Laravel tests remain **unverified** in this environment.

## Local validation

From the project root, with PHP 8.4+, composer development dependencies and compatible Node.js:

```bash
php artisan config:clear
APP_ENV=testing php artisan test --filter=PostCardPresentationTest
APP_ENV=testing php artisan test --filter=PostEngagementContractTest
APP_ENV=testing php artisan test --filter=PostManagementTest
APP_ENV=testing php artisan test --filter=SlidingFeedTest
APP_ENV=testing php artisan test --filter=MemberDashboardTest
npm run build
php artisan view:clear
```

Browser acceptance: compare `/dashboard`, `/community`, the public `/` homepage preview, `/posts/{id}` as guest and as a signed-in member; verify the same seven reaction options, state colors, avatar photo, card spacing, Share, Save and Comments actions. Also verify that anonymous authors remain anonymous and member-only posts cannot open as guests.

When extracting a full source ZIP, keep your existing `.env` and uploads intact. The `public/build` assets in the source archive are not generated from this patch and must be rebuilt with `npm run build` before visual verification.
