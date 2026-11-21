# Community post, comment and reply image optimization — optimized-only storage

## Scope and behavior

The PM Circle community retains **one optimized base image** at the existing media path; it does **not retain a separate full-resolution upload** after successful processing. JPEG and PNG media are eligible. WebP feed previews remain optional display derivatives (320, 640, 1200 pixels wide). There is no database migration, URL change, extra feed query, additional package, or new externally accessible route.

The previous default of keeping an unchanged full-resolution original was intentionally removed at the user's request.

1. Upload validation, post moderation, comment moderation, visibility, and approved-only media routes are unchanged. Pending AI-moderated posts/comments use their existing staging image until approved; rejected images are not made publicly accessible.
2. Once approved/published, a queued Laravel job validates the existing image and creates a high-quality resized/compressed version. By default the **longest dimension is at most 2048 pixels**, preserving aspect ratio. JPEG uses quality 92 by default; PNG stays PNG and retains alpha transparency. The smaller optimized file replaces the original **atomically at the same path**. It retains the same extension and the existing media URLs continue working.
3. If a file is already small and re-encoding makes it larger, the job keeps the smaller existing file. This means an already optimized upload can retain its existing pixels; it does not mean a second original is stored. JPEG EXIF orientation is applied before resizing. Animated GIFs and existing WebP inputs are not re-encoded by this job.
4. The job then generates high-quality WebP previews for smaller display sizes, when smaller than the optimized base file. The React `<CommunityResponsiveImage>` uses the existing `srcSet`/`sizes` behavior, with fallback to the optimized base file when previews are unavailable.
5. A small `.optimized` checksum marker prevents retries or manual backfills from re-encoding the same JPEG repeatedly. Replaced/removed post images clean up both preview files and that marker. No marker or preview is exposed through the protected private-media routes.
6. If image processing is unavailable, an image is too large for the configured safety limit, or processing fails, the original saved upload remains in place. **The job never deletes the only working copy on failure.** Enable PHP GD with WebP and EXIF support to cover eligible images. The `PMC_MEDIA_VARIANTS_MAX_PIXELS` guard defaults to 12,000,000 pixels; above this, processing is skipped to avoid exhausting worker memory.

## Settings

In `config/community.php`:

- `PMC_MEDIA_VARIANTS_ENABLED=true`
- `PMC_MEDIA_VARIANTS_QUEUE=default`
- `PMC_MEDIA_VARIANTS_QUALITY=92` — quality used for optimized JPEG and WebP previews
- `PMC_MEDIA_MAX_DIMENSION=2048` — longest side of the optimized base image, clamped between 640 and 4096
- `PMC_MEDIA_VARIANTS_MAX_PIXELS=12000000` — input decoding safety limit

## Performance, permissions and cleanup

- Media processing runs on the existing Redis/default queue worker outside HTTP requests. The original remains temporarily until the atomic replacement finishes.
- Files are replaced in place, retaining the current public/members-only/private media authorization checks. New routes and new DB queries are unnecessary.
- Staged moderation media is never optimized into public storage before approval.
- Existing published photos remain unchanged until explicitly backfilled. **Back up the uploaded media before any historical backfill because this operation irreversibly replaces the former originals.**

## Optional existing-image backfill

The command now requires an explicit acknowledgement flag; without the flag it refuses to overwrite historical originals:

```bash
php artisan community:images-backfill --limit=100 --replace-originals
```

Use `--after-post=<id>` / `--after-comment=<id>` to resume bounded batches. Do not bulk-queue this while queue workers are backlogged. This command is not called automatically at deploy time.

## Verification

```bash
php -m | grep -Ei 'gd|exif'
php -r 'var_export(function_exists("imagewebp")); echo PHP_EOL;'
php artisan optimize:clear
php artisan queue:restart
php artisan test --filter=CommunityImageVariantsTest
npm run build
```

After processing a new 4000×3000 JPEG, inspect the image at its original storage path: its new maximum side should be 2048px (unless processing was skipped), while its URL and extension remain unchanged. Verify `?size=640` serves WebP where available; confirm that private comment/post URLs reject unauthorized viewers. Verify JPEG phone-photo orientation and PNG transparency. Expect some lossy quality reduction with JPEG and resized previews, even at high quality.

## Test and deployment status

PHP syntax and static regression tests are runnable without Composer dependencies. Laravel tests and actual image conversion must run where Composer, GD and WebP support are installed. No live deployment or destructive backfill was performed by this patch.
