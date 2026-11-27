# Reaction and comment performance engineering — implementation handoff

Source: PM_Circle_Engagement_Implementation_Plan.docx, 26 November 2026, v1.0. Applied to the newer Archive 2(3).zip baseline. This is a staging candidate, not a certified production release.

## Scope

- Existing normalized records remain authoritative. Post built-in counters remain; new per-type and comment projections, version fields and replay fields are additive. No new dependencies, engagement summary cache, counter shards, or speculative ranking indexes.
- EngagementStats owns transactional deltas, initialization and common locks. Comment visibility includes root visibility. Soft deletion hides descendants; hard deletion removes dependent replies. Account deletion locks affected posts and repairs surviving projections. Product owner must confirm root deletion policy before release.
- Existing desired-state APIs return versions and totals, and comments accept submission UUIDs and normalized payload/media hashes. Legacy no-key requests remain compatible but are not retry-safe. Hard-deleted comments do not retain tombstones.
- Batched reaction counts and comment stats are enabled independently. Missing projection reads use exact source fallback; newest/reply pagination uses cursors, relevant ordering uses a bounded encrypted snapshot. Existing design tokens and CSS were not changed.
- CheckCommunityComment uses content revision and pending-state checks; AI calls remain outside transactions. Queues must be drained/paused for cutover; do not rely on repeated job releases under a prolonged gate (attempts are finite).

## Migration and staging gate

1. Back up database and media. Confirm current schema and all writers, pause scheduler/CLI writers and workers, block web writes across all nodes, and drain active transactions. Do not discard pending jobs. Confirm no direct SQL/bulk writers bypass the model and action paths. Keep the app offline during code/schema switch.
2. Inspect invalid legacy reply relationships before migration; investigate already-promoted roots separately (the prior SET NULL behavior erased their original parent IDs). The migration fails closed on cross-post, missing or nested parents, rather than silently moving/deleting content. Review and repair such records manually with a backup and owner approval.

```sql
SELECT c.id, c.post_id, c.parent_id, p.post_id AS parent_post, p.parent_id AS parent_parent
FROM comments c LEFT JOIN comments p ON p.id = c.parent_id
WHERE c.parent_id IS NOT NULL
  AND (p.id IS NULL OR p.post_id <> c.post_id OR p.parent_id IS NOT NULL);
```

3. Install locked dependencies, run tests against a dedicated disposable database and rebuild frontend assets. Node must satisfy the locked Vite dependencies (use Node 22.18+ or compatible newer LTS). The delivered source archive intentionally excludes the stale generated public/build directory. Preserve production .env and runtime storage; do not overwrite them from an archive.

```bash
composer install
npm ci
npm run types:check
npm run build
php artisan test --filter=EngagementImplementationTest
php artisan test --filter=FeedPerformanceArchitectureTest
```

The default phpunit.xml forces SQLite. Create a local copy of that configuration with DB_CONNECTION=pgsql and a dedicated test database, test credentials and no production DB_URL; run `vendor/bin/phpunit -c phpunit.pgsql.xml` there. Never run RefreshDatabase tests against production.

4. Before migration and backfill, set these in the deployment environment (all nodes):

```dotenv
PMC_ENGAGEMENT_WRITE_GATE=true
PMC_ENGAGEMENT_STATS_WRITES=false
PMC_ENGAGEMENT_STATS_READS=false
PMC_ENGAGEMENT_TYPE_READS=false
PMC_ENGAGEMENT_COMMENT_READS=false
```

With web writes stopped and workers paused:

```bash
php artisan config:clear
php artisan migrate --force
php artisan community:backfill-engagement-stats --chunk=200 --force
php artisan community:backfill-engagement-stats --chunk=200 --verify
```

5. Require zero mismatches. Set PMC_ENGAGEMENT_STATS_WRITES=true while reads remain false, rebuild config and restart/refresh all web processes and workers with the new config. Lift gate only after confirming all writers are on the new code. Reconcile under staging load. Enable each read flag only after staging/canary parity and latency checks. Verify again after enabling reads. The backfill command itself requires the gate and disabled counter flags; never backfill against concurrent ungated writes.
6. For rollback, disable all three read flags first and refresh all processes. Keep corrected writers enabled if healthy. If writes are unsafe, gate and drain all writers, disable writes and rebuild/verify before re-enabling. Do not run migration down; it intentionally refuses to drop projection/replay data. Never roll back to old writer code with new projection reads enabled.

## Release checks still required

Actual PHP integration tests, PostgreSQL migration and composite FK checks, full TypeScript typecheck/build and browser UI regression, 100 simultaneous desired-state requests, notification and moderation retry regressions, failure injection and deadlock/Redis outage rehearsal, independent SQL parity verification, query EXPLAIN and load testing are not verified in the delivery environment. No automated reconciliation schedule or shadow/canary controller was added; use the gated/manual runbook and arrange bounded periodic verification and alerting before production sign-off. Measure file-upload lock duration and hot-post contention. The relevant snapshot is bounded to 200 IDs and five minutes. Frontend pending reaction state is local to each mounted picker, not a global cross-surface store. Verify multi-surface updates and stale responses during QA.

Acceptance targets remain the specification's p95 reaction 150 ms, comment reads 200 ms, feed 250 ms; valid-request errors <=0.1%, 15k members and prescribed dataset, 150 feed requests/s plus mixed traffic, 2x peak and four-hour soak. No performance target is claimed as measured. No production changes were made.

## Delivery verification

PHP 8.4 lint: all 22 changed PHP files passed. TypeScript syntax transpilation: all 12 changed TS/TSX files passed (not full typechecking). Node regression: 545/546 passed, including 5/5 feed-window tests. The sole failure is the existing PMP dashboard AI Tokens markup assertion; its test and source files are byte-identical to the uploaded archive. Two engagement static assertions were updated for additive version propagation and qualified visibility columns. Composer, PHP database drivers and installed project dependencies are unavailable; npm dependency installation timed out. The full source package excludes stale public/build and runtime session/view/cache/log/devtools artifacts; rebuild and preserve existing deployment storage.
