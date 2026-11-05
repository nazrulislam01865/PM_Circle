# PM Circle — Photo crop, profile fields and reusable comments patch

## Scope

Applies to the supplied `Archive 6.zip` snapshot. Does not change schema, subscription logic, examination scoring or other dashboard screens.

### Corrected behavior

- Image editor uses a compact, height-constrained scrollable preview with the Cancel and **Crop and upload** actions always visible. Dialog styling is independent of the profile subtree because Radix renders it through a portal.
- Profile/cover upload still validates the image server-side and writes to Laravel's public disk. Existing stored image URLs remain unchanged. The profile view selects the native `/storage` URL when available, or the image-only `/profile-media/{avatar|cover}/{filename}` fallback when a packaged local installation lacks the `public/storage` symlink. The fallback reads only the approved public photo directories and does not issue SQL queries; it is a fallback, not a replacement for a proper storage link in production.
- Community post avatar references now include the avatar field in the **existing** eager-loaded author profile relationship; no extra relationship query is created.
- Experience editor renders End date before Currently work here; selecting it disables the end-date picker as before.
- The two project privacy/featured checkboxes share one compact row without overlapping.
- Location icon is grouped with location text in the profile overview.
- One shared post comment panel is reused by the homepage, member dashboard feed and public community post cards. It fetches a bounded preview only when expanded, shows author and comment details, supports comments, replies and comment reactions without a page reload, and provides a link to the full thread. The full post page keeps its existing thread UI, while the comment action focuses the current thread rather than navigating to itself.

## Query and API behavior

- `GET /posts/{post}/comments/preview?sort=relevant|newest` is public for published, public posts only; at most six root rows are fetched to determine whether more exist, five are displayed, and at most two child replies are eager-loaded per root. Author and comment-like relations use eager loading/aggregates; a single viewer-like lookup is used for signed-in readers.
- `POST /posts/{post}/comments` and `POST /posts/{post}/comments/{comment}/like` return compact JSON for AJAX requests, and retain prior redirect contracts for existing Inertia forms.
- Guest commenting remains protected by existing authenticated, verified and onboarded middleware.
- Profile media fallback is strictly image-oriented and constrained to `profile-avatars` and `profile-covers` paths. Normal static image URLs remain the performance-first path when `php artisan storage:link` has been run.

## Verification

Performed in this environment: PHP syntax lint for changed controller/route/test files, standalone TS/TSX transpile parsing for changed frontend files, CSS parsing for changed stylesheets.

Not performed here: Laravel/PHPUnit execution (Composer vendor directory absent), full frontend TypeScript check/build (Node modules absent), end-to-end browser testing. Run these on your development machine.

## Apply and test

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views
chmod -R u+rwX bootstrap/cache storage
php artisan storage:link   # only if public/storage is not already linked
php artisan optimize:clear
php artisan test --filter=CommunityInlineCommentsTest
php artisan test --filter=ProfileMediaDeliveryTest
php artisan test --filter=ProfileEntryWorkflowTest
php artisan test
npm ci
npm run types:check
npm run build
```

When checking images, confirm `storage/app/public/profile-avatars` exists and is readable and that `public/storage` points to `storage/app/public`. Images already stored should reappear after the storage link is restored; uploads must also return successful server validation.

Only include generated `public/build` files in deployments after a **fresh** `npm run build`. The complete source archive may contain older assets from the user's uploaded snapshot, so always rebuild after applying changes.
