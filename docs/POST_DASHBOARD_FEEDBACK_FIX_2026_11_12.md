# PM Circle – Authenticated homepage and post feedback corrections

## Scope

This patch is based on `Archive 4(3).zip` and the November 12 prototype/screenshots and UI guide.

- The create/edit-post dialog now uses a bounded, responsive layout (rather than an excessively tall editor), with aligned avatar, identity, audience, formatting, and submit controls.
- The visible Home heading is removed; the page retains a screen-reader-only heading.
- Post author role/job position is removed from feed cards and the post detail author line. Content indentation is shared between the member dashboard and Community Feed.
- Reporting creates the administrator report and per-reporter hidden-post row inside a single transaction. The post immediately disappears from that member's feed. The same viewer cannot reopen it from a direct link, saved posts, member profile posts, or the public homepage preview. It remains visible to other authorized members until moderation.
- The right column is ordered as: My profile, Earned badges, Profile insights, Your learning, Exam syllabus, Community contribution. Shared typography, padding, spacing and alignment use PM Circle design tokens.
- The insight card displays the last 30 days and last 7 days in equal columns, and the contribution card displays three equal columns. Learning rows align labels left and values right.
- Badge milestones appear only after a real published post, comment or scenario response. They reflect community milestones, not an external certification or an administrator-issued credential. The Achievements view displays the same earned milestones.
- Member profile views are tracked without recording guest visitor identity, once per distinct signed-in member per profile per day. Self views are excluded; old visits cannot be backfilled. An additive migration creates the indexed table.
- Learning time is measured from completed PMP practice attempts with timestamps. Course browsing time is not tracked, and the app does not yet support an earned learning-level progression, so Level 1 is the baseline until a scoring system is implemented. Scenario count is distinct scenario discussions participated in; community contribution responses count all scenario responses. The syllabus status reflects the latest PMP attempt, not a separate syllabus completion tracker.

## Changed code and dependencies

There are no new third-party packages. All existing post endpoints remain unchanged. A new migration `2026_11_12_000012_create_member_profile_views.php` adds a separate small, indexed table. The previously included post-hides and report migrations must already be applied.

## Installation (macOS, local)

Run from your PM Circle project directory after copying files. Preserve your `.env`, PostgreSQL data and uploaded storage.

```bash
php artisan config:clear
php artisan migrate
npm run build
php artisan view:clear
```

Run tests **only against a testing database**, not production:

```bash
php artisan config:clear
APP_ENV=testing php artisan test --filter=PostManagementTest
APP_ENV=testing php artisan test --filter=MemberDashboardOverviewTest
APP_ENV=testing php artisan test --filter=MemberDashboardTest
APP_ENV=testing php artisan test --filter=PostEngagementContractTest
APP_ENV=testing php artisan test --filter=SlidingFeedTest
APP_ENV=testing php artisan test --filter=MemberDiscoveryTest
```

A full source ZIP excludes prebuilt `public/build` assets; **run `npm run build` before opening the app**. Confirm `public/build/manifest.json` exists afterward. Keep `storage/framework/views`, `storage/framework/cache/data`, and `storage/framework/sessions` writable.

## Verification limits

PHP syntax validation, TypeScript syntax parsing, CSS parsing and archive integrity were performed in the preparation environment. The full Laravel feature suite, Vite production build and browser-level pixel comparison require the local project dependencies and have not been verified here.
