# PM Circle — Admin-managed reaction icons (2026-11-20)

## Scope
- Admin navigation: **Reaction icons** (`/admin/reaction-icons`)
- Seven fixed reaction codes: `like`, `love`, `care`, `haha`, `wow`, `sad`, `angry`
- Uses the existing `ReactionPicker` in community posts, post comments, daily scenarios, scenario responses, plus reaction roster/summary, scenario library Like, post-check preview Love and Activity Log reaction indicator
- Reaction codes, counts, authorization, moderation and reaction endpoints remain unchanged

## Admin workflow
- Each card previews the current icon, chooses a PNG/JPG/WebP (32–1024px per side, max 1MB), uploads it, or restores the built-in icon
- SVG upload is deliberately blocked; existing Lucide symbols remain built-in fallbacks
- On first use, one `home_page_contents` JSON record with key `reaction_icons` holds the seven optional filesystem paths. **No migration** and no seeding required
- Images stored using Laravel's `public` disk at `reactions/...` and served using `Storage::disk('public')->url()`
- One cached catalog read per 5 minutes; cache cleared immediately after every admin upload/reset, without a database query per post/comment
- Missing or failed custom images render the original Lucide icon automatically

## Deployment
- Rebuild frontend (`npm ci && npm run build`), deploy project code, ensure public storage is available (`php artisan storage:link` once if needed), and clear application caches (`php artisan optimize:clear`)
- On deployment to a different server, preserve both the database and **`storage/app/public/reactions`**; uploaded images are not included in Git or fresh source ZIPs
- Run `php artisan test --filter=ReactionIconManagementTest` using the project's normal dependencies

## Verification note
Static PHP/TSX/CSS syntax verification was completed in the provided project. A full Laravel test run and frontend build require Composer/npm dependencies, which were not available in the source archive and could not be installed in this environment.
