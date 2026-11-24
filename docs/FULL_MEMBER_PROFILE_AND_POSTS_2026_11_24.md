# Member profile and post history

The existing author-name and portrait links in the shared PostCard and PostCardV2 lead to `/members/{member}`. The route previously displayed a brief biography and no more than eight public posts. It now renders a read-only professional overview using the same hero/photo and overview cards as My Profile, plus a recent-posts panel and a dedicated Posts tab with complete cursor-paginated history.

## Implementation
- `MemberDirectoryController::show` retains the active-account, verified-email (when configured), profile visibility, existing profile-view recording and follow rules. Eligible active, verified, onboarded members may view members-only profiles; guests may view public profiles. Private profiles remain inaccessible to others. Following remains subject to the original public-profile rule.
- `MemberProfileOverview` projects allowed professional fields using `ProfileFieldPrivacy`, selects only display columns, and loads relational sections only on the Overview tab. Owner-only contact information, uploaded CVs, resume import data, work-sample file paths, billing and private insights are excluded. The existing photo storage/media endpoint is unchanged.
- `ProfileOverviewSections` supports a read-only variant and filters visible sections and fields; the authenticated owner's existing calls still render all fields and edit controls.
- `FeedQuery` accepts an optional author ID; existing callers retain their cursor scope. The member profile feed binds cursors to the requested author, filters anonymous posts before retrieval, and reuses published/member visibility, hidden-post filtering, viewer interaction state, reaction summary and polls. First page 20 posts; subsequent pages 12. The overview previews the three most recent accessible posts; Posts tab exposes all accessible history via adjacent cursor links.
- The homepage, community feed/detail and saved posts author projections recognize member-visible profiles for eligible viewers, apply role/photo field privacy and retain anonymous-post masking. Owner profile links remain available for their own named posts. The profile feed masks a non-visible full name in its post cards; published named-post attribution in other feed contexts is unchanged.
- `members/Show.tsx` uses existing `PublicLayout` member-shell routing, profile CSS/classes and shared post cards. Header, sidebar, footer, My Profile editing workflow and routes are unchanged. No schema migration, new dependency, or new API route is required.

## Verification
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 342 passed, 0 failed.
- PHP syntax checks on all changed PHP files: passed.
- TypeScript transpile syntax checks on all changed TSX files: passed. Not a full project typecheck.
- `FullMemberProfileTest.php` adds feature tests for projection privacy, members-only access, author-specific cursor isolation, and excluded posts. Feature execution blocked by missing Composer vendor/autoload.php.
- Fresh Vite build not executed: npm dependencies not available offline, online installation did not finish, and installed Node 22.16 is below Vite Plus's supported 22.18 minimum. Original compiled assets remain in the archive; rebuild required before browser use. Live authenticated visual/interaction verification remains outstanding.

## Local deployment
Use Node 24.11+ LTS (or compatible Node 22.18+). Run `composer install` if vendor dependencies are absent, `npm ci` if node_modules are absent, `npm run types:check`, `npm run build`, and `php artisan optimize:clear`. Run `php artisan test --filter=FullMemberProfileTest` with configured test dependencies. Hard refresh and open a named post author from Home, Community, post detail and saved posts. Check Overview and Posts pagination with two separate member accounts and a private profile. Do not migrate or seed for this change.

## Follow-up: single-column member profile
Removed the duplicate page name/description and the complete secondary column on both Overview and Posts, including its explanatory privacy notice. The hero name remains the page heading; navigation and follow/edit actions remain available. The main column uses the full existing profile body width and shared styles. The profile visibility rules, post pagination and backend are unchanged. All 343 source regression tests passed with the command above; the changed TSX passed transpile syntax validation. A fresh frontend build and authenticated browser verification remain outstanding.
