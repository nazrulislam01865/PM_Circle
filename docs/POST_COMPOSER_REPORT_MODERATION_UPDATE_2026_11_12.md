# PM Circle · Community post composer & moderation (2026-11-12)

## Scope
- Reuses a single post dialog for creating and editing posts; one Post button on the logged-in dashboard composer.
- Public/community feeds reuse one post action menu and existing engagement actions.
- The action menu provides Edit, Copy link, Toggle notifications, and Delete for the author; Copy link, Hide, and Report for other authenticated members.
- Reporting uses a reason plus optional details, idempotently saves a record for the admin Community moderation screen.
- Anonymous posts enter `pending_review` and may be approved or rejected by a verified, active administrator.
- Post/Question/Poll choices and Public/Community members only visibility are validated server-side. Poll votes are unique per member and may be changed.
- Per-post notification preference is stored in `posts.notifications_muted_at`. No post-comment notification dispatch pipeline currently exists; this toggle persists the preference for future dispatch integration.
- Post card text, shared formatting, report modal, and action menu use the approved PM Circle typography, button and spacing tokens.

## Data changes
Run two additive, non-destructive migrations after backup:
- `2026_11_12_000010_add_post_management_and_moderation.php` adds one nullable preference column plus `post_hides` and `post_reports` with constraints.
- `2026_11_12_000011_create_post_poll_tables.php` adds poll choices and unique member votes.

Members-only post images are stored privately on the Laravel `local` disk and served via a checked, authenticated route rather than the public `/post-media` endpoint. Existing publicly uploaded images are untouched.

## Key code changes
- `resources/js/components/community/PostComposerDialog.tsx`: shared creation/edit dialog.
- `resources/js/components/community/PostActionMenu.tsx`: shared owner/non-owner menu and reporting UI.
- `resources/js/components/community/PostPoll.tsx`: vote and result view.
- `resources/js/components/dashboard/DashboardComposer.tsx`: one post action.
- `resources/js/components/dashboard/DashboardFeed.tsx`, `resources/js/components/community/PostCard.tsx`, `resources/js/pages/community/PostShow.tsx`: shared action menu and aligned metadata.
- `app/Http/Controllers/Community/PostManagementController.php`: owner edit/delete/mute and viewer hide/report.
- `app/Http/Controllers/Community/PostPollController.php`: validated, idempotent poll vote updates.
- `app/Http/Controllers/Admin/PostModerationController.php` and `resources/js/pages/admin/PostModeration.tsx`: admin queue and review.
- `app/Domain/Community/Queries/FeedQuery.php`: batched author-state, saved-state, and poll lookups; hides posts via indexed anti-join.
- `app/Domain/Community/Actions/PublishPost.php`: anonymous review, audience privacy, and poll persistence.

## Verification instructions (on developer Mac with PHP 8.4 and Node 24)

    php artisan optimize:clear
    php artisan migrate:status
    php artisan migrate
    php artisan config:clear
    APP_ENV=testing php artisan test --filter=PostManagementTest
    APP_ENV=testing php artisan test --filter=PostEngagementContractTest
    APP_ENV=testing php artisan test --filter=SlidingFeedTest
    APP_ENV=testing php artisan test --filter=MemberDashboardTest
    npm ci
    npm run build

Run tests only using the dedicated SQLite testing configuration. Do not run migrate or tests against production without a verified backup and change approval. For production rollout, rebuild assets, deploy migrations in an approved maintenance window, and restart long-lived workers as needed.

## Manual regression checks
1. Create a named Post, Question, and Poll and vote; verify results after reload.
2. Create a Community members only post with an image; confirm logged-out visitors cannot see the post or image.
3. In Plus/Pro, submit anonymously, verify not public, approve in Admin > Community moderation, and confirm author identity is masked publicly.
4. Edit text/image; delete own post; ensure others receive 403.
5. Toggle notifications off/on and verify state persists after reload.
6. Save/unsave, hide, report as another member; verify report appears in admin and duplicates do not proliferate.
7. Verify guest post pages, mobile scrolling and accessibility of menus/dialogs, and avatar/image alignment.

## Tests in this source package
A dedicated `PostManagementTest` suite has been added. Because this source ZIP does not include Composer vendor files or npm dependencies, full Laravel integration tests and Vite build must be run locally. PHP lint, TSX transpilation and CSS parsing can be completed without dependencies.
