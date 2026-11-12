# PM Circle Members directory layout alignment — 2026-11-12

## Cause
The Members directory stylesheet imposed a standalone 1,120 px maximum width and a second horizontal inset, while the shared authenticated member shell uses the centralized page content width. This made `/members` narrower than the other logged-in pages.

## Scoped fix
- Remove the 1,120 px page-specific width restriction.
- For authenticated members, allow `.pm-members-page` to fill the existing `.pm-member-public-content` wrapper and inherit the shell's content margins.
- For visitors, leave the existing public `.pm-container` width and mobile rules in charge.
- Avoid double top padding inside the authenticated member shell.
- Preserve the current Members list prototype layout, shared header, search/filter/sort functionality, follow actions and pagination.

## Files and database
Modified `resources/css/pm-member-directory.css` only. No routes, models, queries, migrations or other pages were changed.

## Local verification
Run `npm run build`, `php artisan config:clear`, and `APP_ENV=testing php artisan test --filter=MemberDiscoveryTest`. Compare `/members` with `/dashboard` at the same viewport and zoom. These runtime commands were not run here; stylesheet syntax and archive integrity were checked.
