# PM Circle — Member follow state, Save alignment, Saved/Hidden feed tabs

## Scope

The changes are limited to the member directory follow control, the shared community post action row, and personal Saved and Hidden feed scopes. Existing All / Following / My posts navigation, reaction picker, comments, shares, reporting, moderation, and profile visibility remain in place.

## Behavior

- The member directory uses the existing follow/unfollow routes with JSON confirmation. It updates the button to `✓ Following` or `+ Follow`, the displayed follower count, and the Following tab immediately after successful server response. Errors remain visible without falsely updating state.
- All member rows reserve the same two-button width and a consistent statistics column. Own-profile rows reserve the Follow slot, preventing the statistics column from shifting.
- The common post action row keeps Save at the far right even when reaction count is zero, with the reaction summary immediately before it when available.
- Saved and Hidden tabs appear **only** if the signed-in member has at least one published, accessible post in the respective list. The default three tabs remain unchanged when both lists are empty.
- Saving, unsaving, hiding, reporting, and unhiding update private tab counts after successful mutations. Unhide is exposed in the post menu within the Hidden tab. Hidden posts are read-only until restored.
- Both community and member-dashboard feeds use the same cursor pagination, and fetch further pages only when needed. An initial server projection computes the two private tab counts. No new third-party packages are required.

## Backend

- `app/Domain/Community/Queries/FeedTabAvailability.php` computes the two personal tab counts.
- `app/Models/Post.php` adds viewer-isolated saved and hidden scopes.
- `app/Domain/Community/Queries/FeedQuery.php` reuses the established cursor feed projection and attaches a `viewer_hidden` flag to hidden posts.
- `app/Http/Controllers/Community/PostController.php`, `app/Http/Controllers/Dashboard/DashboardController.php`, and `app/Domain/Dashboard/Queries/DashboardOverview.php` expose the filters and initial availability.
- `app/Http/Controllers/Community/PostManagementController.php` and `routes/web.php` add an authenticated, idempotent DELETE unhide route. It only deletes the requesting member's hidden entry.
- `app/Http/Controllers/Members/MemberDirectoryController.php` returns JSON follow state while preserving traditional redirect behavior.

## Frontend

- `resources/js/pages/members/Directory.tsx` and `resources/css/pm-member-directory.css` handle follow state and aligned grid tracks.
- `resources/js/components/community/FeedScopeTabs.tsx` conditionally displays Saved / Hidden.
- `resources/js/hooks/community/useFeedScopeCounts.ts` reuses the initial counts and adjusts them after successful local changes.
- `resources/js/pages/community/Feed.tsx`, `resources/js/components/dashboard/DashboardFeed.tsx`, `resources/js/types/dashboard.ts` support both personal scopes.
- `resources/js/components/community/PostCard.tsx` and `PostActionMenu.tsx` provide the hidden-post restore action and read-only state.
- `resources/js/components/community/PostEngagementActions.tsx`, `resources/css/pm-post-reactions.css`, `resources/css/pm-post-management.css` keep Save in a persistent trailing group.

## Database impact

`database/migrations/2026_11_16_000003_index_personal_post_scopes.php` adds two PostgreSQL composite indexes on `(user_id, post_id)` in `post_saves` and `post_hides`, using concurrent operations. No existing post or member rows are modified. Review migration status and take a database backup before production deployment.

## Verification

Passed: all changed PHP file syntax checks; TypeScript/TSX transpilation and CSS parsing; `PersonalFeedScopesStaticCheck.php`, `PostReactionRosterStaticCheck.php`, and `ProfileRewardStaticCheck.php` source checks. Feature coverage added in `PersonalFeedScopesTest.php` and `FollowJsonStateTest.php`.

Not verified in this build environment: Laravel feature tests, frontend semantic typecheck/build, live PostgreSQL migration, and pixel-by-pixel browser screenshot comparison (source archive contains no installed Composer/npm dependencies).

## Local commands (macOS / Homebrew PHP 8.4)

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
php artisan migrate:status
php artisan migrate
php tests/Regression/PersonalFeedScopesStaticCheck.php
php artisan test --filter=PersonalFeedScopesTest
php artisan test --filter=FollowJsonStateTest
npm run types:check
npm run build
php artisan optimize:clear
```

Do not run database migrations against production without verifying the connection and backing up the database. Do not replace `.env` or storage with files from an archive.
