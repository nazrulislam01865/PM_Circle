# Member sidebar compact AI badges

Based on the supplied Archive.zip. The existing AI badge used the same 14px typography role as navigation labels. The shared badge now uses centralized 11px text and 10px sparkle icon tokens (at the default root font size), while the 14px menu typography and 20px main icons are unchanged. The same component is used for Courses, Exam Simulator, Daily challenge, AI Resume Assistant, Interview preparation and Community feed. Labels can wrap beside the compact badge when space is limited. Badges are hidden in the icon-only collapsed sidebar. An accessible description identifies the AI functionality without modifying navigation labels.

The badge is a presentation marker for modules that include AI capabilities, not a live provider-status indicator. Existing routes, group ordering, permissions, plan gates and AI configuration remain unchanged. No database changes or additional queries are introduced.

## Verification

- Node source regression suite: 505/506 passed; the PMP full-mock counters test also failed in the original archive (504/505 passed).
- Targeted sidebar and related regression tests: 8/8 passed.
- Standalone strict navigation TypeScript and TSX transpilation syntax checks passed; CSS parsed successfully.
- Chromium representative markup using project CSS: 36 checks passed across 242, 220, 272, 320px expanded widths and 80px collapsed width; verified sizes, containment, trailing icon separation, no row overflow, and collapsed visibility. This is not a live authenticated app test.
- Production build and full application type check not run: dependencies are not installed in the supplied archive.

## Apply

Preserve deployment .env, database and storage. Install dependencies if needed, run npm run types:check, npm run build, php artisan optimize:clear, and php artisan optimize. The archive excludes stale compiled assets, generated bootstrap caches, session/view files and devtools snapshots. No migration or seeding required.
