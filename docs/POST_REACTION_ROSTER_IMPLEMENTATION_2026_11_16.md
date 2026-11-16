# PM Circle — Post Reaction Counter and Roster (16 November 2026)

## Scope

Based on the supplied counter and modal prototypes. The **post action bar** now shows a compact overlapping group of up to three actual reaction types plus a total count, on the right, **immediately before Save**. The Like control remains unchanged except that the duplicate inline count is hidden for posts. Clicking the group opens a reusable, accessible reaction roster with **All** plus only the reaction types that have counts. Every member row comes from `post_reactions` joined to the existing `users` and `profiles` tables; fake member names or hard-coded mock avatars are never inserted.

The same `PostCard`/`PostEngagementActions` are already shared by community feed, member dashboard, homepage previews, saved posts and post detail. No other social, reward, billing, or navigation logic was modified.

## Read performance

- Initial cursor page: one bounded aggregate query (`WHERE post_id IN (...) GROUP BY post_id,type`) when snapshot reads are disabled; when enabled, use the already joined seven `post_engagement_stats` columns — **no extra summary query**.
- Show/saved/home cards use the same reusable projection. No per-card actor loading or N+1 queries.
- Real member list loads **only when clicked**, 20 records at a time, with `id` keyset cursor and a 21st-row has-more check. `post_reactions` is joined once to users and profiles. Fetch is cancelled when tabs change or the popup closes.
- The modal's count summary is sourced from the current statistics snapshot (when enabled) or grouped live rows (when disabled).
- The new concurrent indexes `(post_id, type, id DESC)` and `(post_id, id DESC)` support filtered and All tabs without taking a PostgreSQL write lock during index creation. Existing data is preserved.
- The shared summary is updated after successful Like/Love/etc. writes; rejected requests roll back through the existing `ReactionPicker`. Opening the modal refreshes the counts from the server.

## Security and privacy

- The new route is read-only and throttled: `GET /posts/{post}/reactions/users`.
- It reuses the exact `PostInteractionController::ensurePublic()` visibility and hidden-post checks; unpublished/hidden posts return 404 and members-only posts require an active verified, onboarded member.
- `type` is restricted to the existing seven allowed reactions; `after` is a positive integer.
- Names and types are from real member rows. A member profile link and photo are returned **only for public, active, eligible profiles**; private-profile photos are never exposed and demo portraits are disabled in this roster.
- Only bounded profile fields are selected; email, phone, resume, and private profile fields are never returned. JSON responses use `private, no-store`.

## Affected source files

- `app/Domain/Community/Queries/PostReactionSummary.php` — central batched counts projection, uses existing statistics when enabled.
- `app/Domain/Community/Queries/FeedQuery.php`, `app/Http/Controllers/PublicSite/HomeController.php`, `app/Http/Controllers/Community/PostController.php`, `app/Http/Controllers/Account/SavedPostsController.php` — supply the same count contract everywhere.
- `app/Http/Controllers/Community/PostInteractionController.php`, `routes/web.php` — paginated real-member response, existing authorization, throttle.
- `database/migrations/2026_11_16_000002_index_post_reaction_tabs.php` — non-destructive PostgreSQL concurrent read indexes.
- `resources/js/components/community/PostReactions.tsx` — shared summary, dialog, tabs, roster and loading/error states.
- `resources/js/components/community/PostEngagementActions.tsx`, `resources/js/components/community/PostCard.tsx` — summary placement before Save, live count updates.
- `resources/js/components/home/HomeEngagement.tsx` — exports the existing reaction definition, optional inline counter (off for posts only).
- `resources/js/components/pm/Avatar.tsx` — opt-out from demo portraits for real reactor rows.
- `resources/js/components/dashboard/DashboardFeed.tsx`, `resources/js/components/home/HomePostPreview.tsx`, `resources/js/types/dashboard.ts` — carry the existing card data contract.
- `resources/css/pm-post-reactions.css`, `resources/css/app.css` — scoped styling using the approved PM Circle tokens, including a responsive three-plus-two layout.
- `tests/Feature/Community/PostReactionRosterTest.php`, `tests/Regression/PostReactionRosterStaticCheck.php` — backend feature cases and dependency-free source regression.

## Verification performed on this archive

- PHP syntax validation of every modified PHP source: **pass**.
- TypeScript TSX syntax parsing of changed components: **pass**.
- CSS parser: **pass**.
- New source-regression contract plus existing profile reward, footer, contact and PMP dashboard checks: **pass**.
- Laravel feature tests, TypeScript semantic check, Vite build, and actual browser screenshot comparison: **not run** (the uploaded source has no installed `vendor` or `node_modules`; required dependency installation was not available in the execution environment).

## Local installation (macOS, Homebrew PHP)

Extract the changed-files ZIP at the PM Circle root, preserving directory structure. Review the pending migration against the **intended database** before running it. Use `php`, not `php8.4`, on the Homebrew PHP 8.4 Mac. Use compatible Node >= 22.18.

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
php artisan migrate:status
php artisan migrate
php tests/Regression/PostReactionRosterStaticCheck.php
php artisan test --filter=PostReactionRosterTest
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

For production: back up the database first; deploy via your normal tested release process, and run `php artisan migrate --force` only after reviewing the index migration. No data is deleted or rewritten. Do not run destructive migration rollbacks. Restart long-running PHP queue/realtime processes only if that is part of your normal deployment process; this feature does not introduce jobs.
