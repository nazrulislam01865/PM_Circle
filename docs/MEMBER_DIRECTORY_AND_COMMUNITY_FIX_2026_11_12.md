# PM Circle — Members Directory, Community Navigation, Home Cleanup (2026-11-12)

## Scope

1. Replaced the old three-column Members directory with the approved compact member-list layout. The shared logged-in header, public homepage, and member profile page are unchanged.
2. Added Role, Industry, and Location dropdowns using the already installed `PMDropdown`; a manual-submit search, All/Following tabs, and Recently joined/Name/Most followers sorting.
3. Reused existing public profile attributes and existing `member_follows` endpoints. Counts are derived from stored follows and published non-anonymous public posts; no sample/fabricated members or counts.
4. Updated the authenticated header's Community link to `/community` (existing `community.index` route), rather than the dashboard fragment.
5. Removed the Today's practice card from the authenticated dashboard and removed its now-unused Scenario lookup. The existing community feed, posting and activity controls are preserved.

## Source modifications

- `app/Http/Controllers/Members/MemberDirectoryController.php`: indexed/paginated listing; optional search and filters; public-only profile projection; correlated counts and follow status; bounded, cached dropdown choice queries; existing follow/show endpoints retained.
- `resources/js/pages/members/Directory.tsx`: prototype-style list, filters, badges, actions, sorting, paging, empty states.
- `resources/css/pm-member-directory.css`: Members-only responsive styling tied to central design tokens.
- `resources/css/app.css`: loads the new Members stylesheet.
- `resources/js/components/dashboard/MemberHomeHeader.tsx`: `/community` navigation fix.
- `resources/js/pages/account/Dashboard.tsx`: removes practice card only.
- `app/Domain/Dashboard/Queries/DashboardOverview.php`: avoids unused scenario DB fetch; leaves the `scenario` projection key nullable for compatibility.
- `tests/Feature/Members/MemberDiscoveryTest.php`: directory filters, counts, privacy, guest behavior and community navigation integration coverage.

## DB and performance

No migrations. Members remain paginated at 12, with `profile` eager loaded, and correlated SQL count/existence selections rather than N+1 per member. Filter option values are bounded and cached for 60 seconds outside tests. Public member search, fields and follower actions remain protected by the existing backend validations and authorization. No extra dashboard query was added; one obsolete query was removed.

## Local verification

```sh
php artisan optimize:clear
php artisan test --filter=MemberDiscoveryTest
php artisan test --filter=MemberDashboardTest
npm run build
```

Also manually verify `/members` in guest and member sessions (search, filters, sorting, follow/unfollow, empty result, mobile layout), `/community` after login, and `/dashboard` without the practice section. Do not use production user data for tests.

## Verification in source container

PHP syntax and TypeScript syntax parsing passed, CSS parsing passed, ZIP integrity will be checked on packaging. Laravel feature tests, Vite build and browser-level visual comparisons could not be executed against the uploaded project here because the archive contains neither Composer `vendor` nor installed npm dependencies. Do not treat source parsing as functional test success.
