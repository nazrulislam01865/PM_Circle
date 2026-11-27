-- REVIEW ONLY: PostgreSQL staging. Do not run candidate DDL until actual bound query plans justify it.
SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('posts', 'comments', 'post_reactions', 'post_saves', 'post_hides', 'member_follows') ORDER BY tablename, indexname;
SELECT c.relname, i.indisvalid, i.indisready FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname LIKE 'idx_posts_%';
-- Candidate A: execute outside a transaction only after reviewing all/member/deep cursor plans.
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_member_feed_recent ON posts (published_at DESC, id DESC)
-- WHERE status = 'published' AND visibility IN ('public', 'members') AND deleted_at IS NULL AND published_at IS NOT NULL;
-- Candidate B: assess sparse mine/following scans and existing author_id,published_at index first.
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_feed_recent ON posts (author_id, published_at DESC, id DESC)
-- WHERE status = 'published' AND visibility IN ('public', 'members') AND deleted_at IS NULL AND published_at IS NOT NULL;
-- Capture actual SQL/bindings from synthetic staging requests, then run EXPLAIN (ANALYZE, BUFFERS)
-- against those exact statements for all, following, mine, saved, hidden, tied timestamps and deep seeks.
-- Compare custom vs generic plans. Concurrent builds can leave INVALID indexes; review before retry.
