# PM Circle — profile image and plain-text reply toggle correction

Date: 2026-11-05

## Scope

This small patch addresses two regressions reported from the latest member-profile and community screenshots. It does not change comment API calls, reaction persistence, database schema, subscriptions, or unrelated pages.

## Root causes and corrections

1. The shared inline `View 1 reply` disclosure accidentally inherited the filled Like/Reply action styling from a combined CSS selector. Dashboard feed button styles also had a higher CSS specificity and could add padding. The disclosure now renders just the text, with zero padding, margin, border, background, box shadow, and no icon. Hover changes the text color/underline only, and keyboard focus remains visible. The reply count and expand/collapse state are unchanged.
2. The profile Overview portrait CSS was overriding the portrait dimensions inside the Edit profile media card. The Edit frame now controls its own image size, including on mobile. The reusable `ProfileHeroPhoto` component displays the photo if available and initials if its URL is broken; it no longer displays a browser-rendered full-name `alt` string inside the circle.
3. Profile and cover uploads could leave an already-loaded `profile` Eloquent relationship stale within the authenticated member object. The upload handler now synchronizes that in-memory relationship after a successful save. This does not add a database query. Avatar removal also updates the cached relation. Existing member authorization, validation, storage paths, and media-serving route are preserved.

## Changed files

- `resources/css/pm-engagement.css` — text-only reply disclosure CSS, more specific than dashboard button styling.
- `resources/js/components/community/InlinePostComments.tsx` — text-only reply disclosure with functional `aria-expanded` and toggle behavior.
- `resources/js/components/profile/ProfileHeroPhoto.tsx` — reusable member-profile portrait with image error fallback.
- `resources/js/pages/settings/profile.tsx` — use that component in the Edit and Overview portrait slots.
- `resources/css/pm-profile-ux.css` — fit Edit portrait to its media frame, and style fallback and loaded photos.
- `app/Http/Controllers/Settings/ProfileController.php` — keep uploaded or removed image changes in the authenticated user's already-loaded profile relation.
- `tests/Feature/Settings/ProfileMediaDeliveryTest.php` — regression for cover upload visibility; existing avatar-upload test covers the reported failing case.

## Database impact

None. No migrations, additional tables, or new queries.

## Verification performed in packaging environment

- PHP syntax: passed on modified PHP files.
- TypeScript / TSX standalone syntax parsing: passed on modified files.
- CSS parsing and targeted selector checks: passed.
- Full frontend type checking/build and Laravel feature tests: **not executed** here because this ZIP does not include Composer and Node dependencies. Headless browser execution timed out, so visual QA of the running app remains outstanding.

The provided local test log shows the existing build passing and **140 tests passing, one failing** in `ProfileMediaDeliveryTest`, with `profileData.avatar_path` unexpectedly `null`. The current patch targets that precise failure; it is not yet independently retested end to end.

## How to apply and verify on Mac

Use the updated-files archive, not a replacement of your storage/database. Extract into the project root and preserve `.env`, `storage/app`, and database data.

```sh
cd /Applications/XAMPP/xamppfiles/htdocs/laravel/PM_Circle
mkdir -p bootstrap/cache storage/framework/views storage/framework/cache/data storage/framework/sessions
chmod -R u+rwX bootstrap/cache storage
php artisan config:clear
npm run types:check
npm run build
php artisan test --filter=ProfileMediaDeliveryTest
php artisan test --filter=CommunityInlineCommentsTest
php artisan test
```

Validate in the browser: (1) the `View 1 reply` control has text only and remains clickable, (2) the Edit photo circle no longer overflows the header, (3) uploading and reloading an avatar displays the stored photo in both Edit and Overview, and (4) an unavailable image falls back to initials without broken alt text. If the saved image itself was removed from `storage/app/public/profile-avatars/`, upload a new photo; source-code changes cannot restore missing user files.
