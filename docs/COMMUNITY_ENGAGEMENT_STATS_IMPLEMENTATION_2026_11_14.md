# PM Circle - Community Engagement Optimization (2026-11-14)

## Scope and guarantees

Implemented in the existing Laravel modular monolith. Public/member navigation, feed visual design, reaction palette, post saving, polls, Daily Challenge and scenario reactions, and unrelated account/business logic are unchanged. The existing account-deletion operation now adjusts affected post counters in the same transaction before foreign-key cascades.

The post reaction mutation is a desired-state transaction with a PostgreSQL transaction-scoped advisory lock per member (covering simultaneous reactions, comments, and account deletion), a unique database key, and atomic statistics deltas. Comment reaction mutations use the same lock pattern, while their bounded displayed counts still use `withCount`. Feed pagination remains the existing encrypted, filter-bound **20-first / 12-next** cursor. Post details and inline previews load **at most two replies per root**; a new authenticated/guest-readable, visibility-checked endpoint returns five further replies per request. No Redis cache or new worker is required.

Statistics contain active post reactions and all non-soft-deleted comments/replies. Each seven-type counter and the total are synchronized in the same transaction. PostgreSQL enforces nonnegative counters and equality between the total and the sum of reaction types. Direct raw SQL changes to reactions/comments or account deletion bypass Eloquent transaction hooks and are **not supported while the counters are live**. Any administrative or bulk data repair must use the application transaction paths or reconcile under a write gate.

## New configuration (all OFF by default)

Add these to `.env` only when proceeding with the staged cutover:

```
PMC_ENGAGEMENT_STATS_READS=false
PMC_ENGAGEMENT_STATS_WRITES=false
PMC_ENGAGEMENT_WRITE_GATE=false
```

The three keys are read from `config/community.php`. Production config caching and PHP-FPM/worker process restarts are required for changes to take effect. The statistics read path automatically falls back to the original `withCount` when `WRITES=false` even if `READS=true`.

## No-destructive-change staging/production rollout

1. **Before deployment:** Verify current branch, PHP runtime and PostgreSQL release. Back up the database, verify restore access and record current feed p50/p95, query counts, error rate, database lock waits, and available disk. Test in an isolated staging PostgreSQL database first. No destructive production operations are authorized by this package.
2. **Deploy source code and apply additive migration** while all three switches remain false. Review table sizes; the PostgreSQL index migration uses `CREATE INDEX CONCURRENTLY` outside migrations transactions. It may need to be deployed separately if a failed concurrent index was left INVALID.
3. **Warm up / verify old path:** `php artisan migrate --force`, `php artisan optimize:clear`, `php artisan config:cache`, and run the current Community tests (see below). At this point reads and writes use the legacy path; the new table is not yet authoritative.
4. **Start brief controlled engagement-only write pause:** Set `PMC_ENGAGEMENT_WRITE_GATE=true`, keep `READS=false`, `WRITES=false`. Refresh config cache, restart PHP-FPM and relevant long-lived workers; wait for in-flight requests to finish. Confirm reaction and comment write requests return HTTP 503 and `Retry-After: 60`. Read-only feed and replies must remain available. New posts created during the gate receive an empty statistics row.
5. **Backfill:** Run `php artisan community:backfill-engagement-stats --force` after confirming that all engagement writers use the new gated code. It processes up to 200 posts per batch (change with `--chunk=...`). It deliberately refuses to run without the gate or while stats reads/writes are on.
6. **Verify:** `php artisan community:backfill-engagement-stats --verify`. Exit code **0** and `mismatches: 0` are required. Any mismatch means **do not enable statistics reads/writes**; investigate, backfill with gate maintained, and verify again.
7. **Activate counters while the gate is still ON:** Set `PMC_ENGAGEMENT_STATS_WRITES=true` and `PMC_ENGAGEMENT_STATS_READS=true`, retain `PMC_ENGAGEMENT_WRITE_GATE=true`. Rebuild config cache and restart PHP-FPM; verify the count path with the gate still in effect. Verify newly created post statistics if posts were created during the gate.
8. **Reopen engagement writes:** Set `PMC_ENGAGEMENT_WRITE_GATE=false`, refresh config and restart PHP-FPM/long-lived workers. Perform authorized reaction/comment smoke tests; verify persisted rows and stats reconcile. Measure p95, query count, DB locks, error logs, CPU and RAM against the baseline.
9. **Fail-safe:** On any count mismatch or serious regression, **turn READS=false first** to restore the old per-post aggregate read path. To pause writers set `WRITE_GATE=true`; do not turn `WRITES=false` while still allowing edits and expecting statistics to remain current. After a writer rollback, re-gate and re-backfill before re-enabling statistics reads.

### Commands after implementation, on staging first

```bash
cd /var/www/pm-circle
php8.4 artisan migrate --force
php8.4 artisan optimize:clear
php8.4 artisan test --filter=EngagementStatsImplementationTest
php8.4 artisan test --filter=PostEngagementContractTest
php8.4 artisan test --filter=SlidingFeedTest
php8.4 artisan test --filter=CommunityInlineCommentsTest
php8.4 artisan test --filter=CommunityCommentReactionsTest
php8.4 artisan test --filter=CommunityCommentMediaTest
# ONLY after gated deployment described above:
php8.4 artisan community:backfill-engagement-stats --force
php8.4 artisan community:backfill-engagement-stats --verify
php8.4 artisan config:cache
```

Use the actual PHP binary from the target environment. Run PHP and JS builds using dependency versions supported by the project and a compatible Node runtime; do not copy stale `public/build` artifacts from the ZIP without rebuilding.

## Test/acceptance specification

- R01-R05: None -> Like, repeat Like, Like -> Love, remove/repeat remove, and all seven types; one row per `(post_id,user_id)` and exact type/total deltas.
- R06-R08: Guests, suspended users, membership visibility and hidden posts cannot bypass authorization; anonymous author information remains masked; old JSON keys/POST and DELETE routes are unchanged.
- R09-R13: Root and reply comment counts; invalid parent and cross-post checks; comment soft-delete/restore; seven-type comment reaction and existing save logic; account deletion must compensate surviving posts before FK cascades.
- C01-C05 (**mandatory on real PostgreSQL staging**): Same-user first insert race; concurrent type changes; 100 distinct users react to the same post; remove/change race; and rollback on counter update failure. Counts must equal authoritative rows with no negative counts. Do **not** treat SQLite tests as equivalent to PostgreSQL locking tests.
- C06-C08: Redis unavailable does not affect reaction writes; gated verifier cannot drift; turning read flag off restores the old count path.
- P01-P08: 20/12 cursor uniqueness; visibility/anonymous masks; bounded statement count and no N+1; 5,000-reply root loads only 0-2 previews; cursor batches of five replies; relevance sort; Postgres EXPLAIN index usage; no p95 regression at equal load.
- Any failure of reconciliation, access control, rollback, or PostgreSQL concurrency testing is a **no-go** for enabling stats reads in production.

## Implementation file map

- `app/Domain/Community/Actions/ReactToPost.php` - typed, serialized post reaction state transitions; authoritative response count.
- `app/Domain/Community/Actions/ReactToComment.php` - typed comment-reaction state transitions and backward-compatible Like toggle.
- `app/Domain/Community/Services/EngagementStats.php` - stats read/write flags, atomic counter updates, advisory locking.
- `app/Models/Post.php`, `app/Models/Comment.php`, `app/Models/PostEngagementStats.php` - new-post initialization, comment creation/deletion/restore transitions, statistics model.
- `app/Http/Controllers/Community/PostInteractionController.php` - gated writes and bounded replies endpoint.
- `app/Domain/Community/Queries/FeedQuery.php` - conditional stats join, unchanged encrypted cursor and batched viewer state.
- `app/Http/Controllers/Community/PostController.php`, `app/Http/Controllers/PublicSite/HomeController.php`, `app/Http/Controllers/Account/SavedPostsController.php`, `app/Http/Controllers/Members/MemberDirectoryController.php` - conditional counts path, unchanged JSON contracts.
- `resources/js/components/community/CommunityComment.tsx`, `InlinePostComments.tsx`, `CommentComposer.tsx` - existing comment UI, bounded reply loading, correct view-reply numbers.
- `app/Http/Controllers/Settings/ProfileController.php` - account deletion compensates engagement counters before FK cascades.
- `app/Console/Commands/BackfillEngagementStats.php` - chunked backfill and independent verifier.
- `database/migrations/2026_11_14_000001*`, `2026_11_14_000002*` - additive counters and nonblocking PostgreSQL query indexes.
- `tests/Feature/Community/EngagementStatsImplementationTest.php` - new functional/regression coverage.

## No destructive rollback

There is no automatic `DROP TABLE` down migration: engagement statistics are durable. Use flags for an emergency rollback. A future schema removal requires explicit production approval, a backup, and a separate reviewed migration.
