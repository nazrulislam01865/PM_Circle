# PM Circle — comment controls, profile avatars, and Laravel compiled-view directories

## Scope and source of truth
Based on `Archive 8.zip`, the two supplied screenshots, and the shared PM Circle design-system CSS. No unrelated page or schema changes.

## Implemented
1. **Comment hover and actions.** The shared inline comment Like, Reply, view replies, and Close controls have a visible light blue background at rest, a slightly darker hover background, keyboard focus, disabled and pressed states. The Post/Reply submit button uses the shared primary button color and a clearly distinguishable disabled state. The rules live only in `resources/css/pm-engagement.css`.
2. **Sorting prototype.** `Most relevant` is plain text plus a down chevron (no input border), located before the comment list, below the composer. The original two sorting modes and backend logic remain functional.
3. **Uploaded member photos.** The existing photo-saving process and public image route are retained. Stored avatar URLs are consistently resolved through `/profile-media/avatar/{filename}`, which works without a `public/storage` symlink as long as the physical file exists on the public disk. The authenticated user's avatar path is shared with navigation, sidebar, dashboard, and comments. Comments load author avatars with bounded eager-loaded relations; guest comment previews respect private profile visibility. Failed `<img>` requests fall back to initials.
4. **Laravel compiled views.** Add `.gitignore` sentinels to `storage/framework/views`, `storage/framework/cache`, `storage/framework/cache/data`, and `storage/framework/sessions` to keep Laravel's expected directories in future source archives. No application cache path or production Blade config is changed.

## Database and performance
No migration. No per-comment avatar query. Member-shell profile is loaded once and reused with `loadMissing()`. The comment preview is bounded, with at most two eager-loaded replies per top-level comment. Uploaded image delivery uses the existing filesystem route, not additional database queries.

## Local installation
Copy the changed files from the update ZIP to the existing PM Circle directory; **preserve** `.env`, database, `storage/app/public`, `storage/app/private`, and all user files. If an avatar file was lost during a prior full replacement, source edits cannot recover it: upload it again.

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
mkdir -p bootstrap/cache storage/framework/views storage/framework/cache/data storage/framework/sessions storage/logs
chmod -R u+rwX bootstrap/cache storage
php artisan optimize:clear
npm run types:check
npm run build
php artisan test --filter=ProfileMediaDeliveryTest
php artisan test --filter=CommunityInlineCommentsTest
php artisan test
```

If `npm run build` fails in Wayfinder, first fix the missing compiled-view directory (commands above) and retry; do not change Vite configuration. If file permissions still fail, repair ownership for the current macOS user rather than setting `777`. Use Node >=22.18 for the project toolchain.

## Verify photos
1. Upload a new profile photo and complete Crop and upload.
2. Refresh Overview, dashboard header/sidebar, and open a comment on the homepage or community feed.
3. If the avatar is still missing, inspect the record's `avatar_path` and verify the underlying file still exists under `storage/app/public/profile-avatars/`.
4. Open `/profile-media/avatar/<filename>` in the browser; if it returns 404, the stored file is absent or inaccessible (or the filename was changed). Do not delete user uploads or repoint the filesystem blindly.

## Checks in authoring environment
- Changed PHP files: `php -l` passed.
- Changed TS/TSX files: TypeScript transpilation syntax passed.
- CSS: parsed without errors.
- Chromium static fixture at 1280 and 390 px: no horizontal overflow, selector unboxed, button background visible and darker on hover.
- Laravel feature tests and full frontend build: **not executed**, because Composer `vendor` and Node project dependencies are absent in this container.
