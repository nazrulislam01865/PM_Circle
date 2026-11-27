# Member feed performance rollout

Source: PM Circle Performance Implementation Plan v1.0, 26 November 2026. This is a staged implementation, not production capacity certification.

## Delivered
- WP01: independent dashboard props, deferred summaries, targeted feed/check reloads and local retry, with legacy dashboard fallback.
- WP02: reuse encrypted keyset cursors and existing 20/12 page sizes, anchor and viewer/filter/context binding, current authorization and private no-store. Pre-update cursors are rejected; reload to restart the feed.
- WP03: opt-in bounded dashboard window, forward/backward requests, ID deduplication, 96 target / 120 hard active payloads, no inactive private snapshots, measured spacers, request identity and cancellation. Focused/busy/unsent cards are protected from eviction; root comment drafts have a bounded in-memory store (24 per viewer). No private feed localStorage. The standalone community page retains its existing append mode.
- WP05: repair visible-comment backfill and deletion compensation, moderation transitions and write gate. Existing counter tables and read/write flags are retained; do not activate counters before reconciliation.
- WP07: card-level reconciliation, visibility-aware non-overlapping moderation polling and explicit feed refresh, existing media pipeline and queue topology retained.
- WP00/08: opt-in aggregate request timing, regression fixtures, Laravel feature tests, staging load harness and index inspection SQL.
- WP04/06: intentionally no new indexes, cache or projection until representative PostgreSQL plans and measurements justify them. No new dependency or migration.

## Staging verification and rollout
Keep existing .env, APP_KEY, database and persistent storage. Back up and verify restore before any counter cutover. Install locked dependencies, run existing migrations if pending, build assets and run tests:

```sh
composer install
npm ci
php artisan optimize:clear
php artisan test --filter=FeedPerformanceArchitectureTest
node --experimental-strip-types --test tests/Regression/feedPerformanceWindow.test.mjs
npm run types:check
npm run build
```

Measure baseline with the two rollout switches off; enable timing on staging only. After passing baseline checks, enable progressive dashboard and then bounded window separately, refresh configuration and restart long-lived workers. Do not enable globally before acceptance. New switches default false:

```dotenv
PMC_PROGRESSIVE_DASHBOARD_ENABLED=false
PMC_BOUNDED_FEED_ENABLED=false
PMC_FEED_PERFORMANCE_TIMING=false
```

Timing header contains only aggregate application and SQL duration/count; no bindings or member information. Capture query plans with real staging bindings for all, following, my, saved and hidden tabs and deep cursors. Use `feed-index-review.sql` for inspection; candidate DDL is commented out. Do not automatically create indexes.

For engagement counter cutover use the existing project runbook in `docs/COMMUNITY_ENGAGEMENT_STATS_IMPLEMENTATION_2026_11_14.md` and plan p14. Pause/drain conflicting workers. Set gate true and reads/writes false, rebuild config and restart processes, then run `php artisan community:backfill-engagement-stats --force` followed by `php artisan community:backfill-engagement-stats --verify`. Require zero mismatches and successful PostgreSQL concurrency/visibility tests. While gate is still true turn reads and writes on, rebuild config and restart; verify before turning gate off and restarting again. If mismatch, disable reads first; keep writes active or gate before disabling them. Never run backfill on live production without approval.

## Load and release gates
Use only authorized staging with synthetic accounts/data. Supply a JSON array of distinct synthetic sessions `{ "cookie": "...", "csrf": "...", "post_id": 123 }` (not committed). Ensure the cookies remain valid, the fixture has enough visible posts and the request allocation does not exceed real per-user rate limits. Run the script `k6 run docs/performance/feed-load.k6.js` with `PMC_ALLOW_STAGING_LOAD=YES`, `PMC_STAGING_URL`, `PMC_SESSIONS_FILE`, `PMC_FEED_RATE`, `PMC_DURATION`, `PMC_FEED_VUS` environment variables. Set `PMC_LEGACY=1` for baseline, unset for progressive. Set timing true. Use 5/25/75 RPS phases (75 for 30 minutes), 150 for 15 minutes, spike and 4-hour soak according to the plan. Additional dashboard/comment/reaction traffic is included; upload and moderation load must be tested separately. Review actual achieved arrival rates, per-user throttles, server timing and database/worker health; a failed or dropped iteration is not a passing load test.

Release requires AC01-09 in the source specification, including P95 <=250ms at 75 feed requests/s with mixed traffic, P99 <=750ms, no unauthorized rows or mismatched counters, actual browser heap/scroll-anchor/mobile and composer-state verification, and real PostgreSQL concurrency. Disable progressive dashboard/bounded window independently if regressions are detected, disable timing after measurement. No production configuration has been changed.

## Verification in this package
Node source regression suite: 542/543 passed, one pre-existing PMP dashboard assertion failed. The five new regression tests passed, including the simulated 1,000-post forward/backward traversal and pin/cap tests. Laravel runtime tests, full TypeScript check/build, live PostgreSQL plans/concurrency, real browser scroll/heap measurements and k6 performance gates are not verified in the supplied dependency-free environment. The browser window algorithm fixture is not a browser acceptance test. No claim of achieved capacity or exact pixel stability is made.
