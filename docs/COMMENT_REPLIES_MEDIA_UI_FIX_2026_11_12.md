# PM Circle — Shared comment thread / reply UX correction

Scope: only shared post/comment display and author-visible community discussion interactions.

## Changes

- Existing post `ReactionPicker` is still used for comment reactions. Centralized reaction colors now override conflicting legacy comment-button rules, including the seven choices and active color.
- Post body alignment now excludes the global profile card's `pm-card-body` padding; author name and content share the same left inset.
- `CommentComposer` is shared between post details, expanded feed comments and inline replies. Main submit says **Comment**; nested reply submit says **Reply**.
- Reply composer opens beneath the selected comment. Replies are shown one level beneath the root comment with a plain View/Hide replies toggle. Replies on a nested comment use the existing top-level parent (`parent_id`) to preserve the current database hierarchy.
- Emoji shortcuts, local PNG/JPEG/WebP image and animated GIF file attachments are supported without third-party APIs. One attachment per comment, maximum 5 MiB. GIF button selects an uploaded GIF; no online GIF search service was introduced.
- Images are stored on the Laravel **local/private filesystem** and served only through a visibility-checked, bounded route. SVG and non-image uploads are rejected.
- Public post, detailed post, and expanded feed all render comment media from one `media_url`. No N+1 comment-media queries or new dependencies were added.

## Database impact

One additive, nullable `comments.media_path` column. Existing records and comment reactions remain unchanged. Back up data before applying the migration.

## Verification

Executed: `php -l` on modified PHP files; TypeScript TSX syntax parsing; CSS parsing. No full Laravel/PHPUnit integration tests or production Vite/browser build were possible in the supplied source-only environment. Regression tests for media upload/access/invalid attachment were added.

## Local verification

```bash
php artisan config:clear
php artisan migrate
APP_ENV=testing php artisan test --filter=CommunityCommentMediaTest
APP_ENV=testing php artisan test --filter=CommunityInlineCommentsTest
APP_ENV=testing php artisan test --filter=CommunityCommentReactionsTest
APP_ENV=testing php artisan test --filter=PostEngagementContractTest
npm run build
php artisan view:clear
```

Preserve `.env`, uploaded media, production database, and storage. Do not overwrite the existing storage directory with a source archive.
