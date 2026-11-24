# Member profile navigation and 404 handling

Baseline: PM_Circle_Member_Profile_Simplified.zip. The member profile Overview/Posts layout and existing route URLs are unchanged.

## Implementation
- `MemberProfileAccess` is the shared account/profile access rule. It honors active non-admin accounts, configured email verification, existing profiles, public/member-only audiences and owner access. It never queries the database. Author projections use the existing eager loading, with the necessary account fields, and hide those fields and inaccessible profile data before serialization.
- Homepage, dashboard, community feed (including cursor pages and saved/hidden filters), saved posts, post details, comments, replies and reaction-roster URLs now carry server-authorized links. Anonymous posts continue using the existing `Post::anonymizeForPublic()` masking.
- The frontend no longer reconstructs `/members/{id}` from a post or comment author ID. Restricted post authors keep the existing unavailable dialog; unavailable comment authors are not linked. Sample posts remain unlinked.
- The member GET controller resolves the numeric ID internally rather than through implicit model binding, allowing missing or unavailable profiles to render `members/Unavailable` with HTTP 404 and standard Inertia shared props. JSON callers still receive a normal 404. No global exception-handler change, route URL change, or new endpoint is required.
- Member-only and owner access are intentionally retained from the existing controller rather than narrowing to public profiles only. Existing profile field settings are not modified.

## Verification
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 347 passed, 0 failed.
- `php tests/Regression/PostReactionRosterStaticCheck.php`: 9 checks passed.
- PHP lint: all changed/new PHP files passed. TypeScript transpile syntax: all 7 changed/new TS/TSX files passed; this is not a full typecheck.
- Added `tests/Feature/Members/MemberProfileAccessTest.php` for guest/member/owner access, inactive/unverified/admin/missing profile cases, anonymous posts, post details/comments, and stale/missing Inertia URLs.
- Laravel feature tests could not execute: vendor/autoload.php is absent. Frontend build could not execute: local Vite Plus dependency (`vp`) is unavailable. No live database or authenticated browser validation performed. The precise original live 404 has not been confirmed.

## Deployment
Run with installed project dependencies and a supported Node version:

```
npm run types:check
npm run build
php artisan optimize:clear
php artisan test --filter='MemberProfileAccessTest|FullMemberProfileTest|PostReactionRosterTest'
```

Rebuild before serving the updated frontend. Existing bundled assets are unchanged and will not contain the new fallback page or new frontend URL contract until rebuilt. No migrations, seeders, new dependencies or environment variables are required. Verify in an authenticated browser using public, member-only, private and anonymous posts, and direct stale or missing member links.
