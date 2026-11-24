# Post identity navigation and composer usability

Source: Archive 5(3).zip and the included PM Circle HTML design guideline.

- Feed and homepage titles remain the same color and decoration before and during hover. Title/body/image links retain their existing post-detail navigation, with keyboard focus styling.
- `PostAuthorLinks` is shared by the canonical PostCard and homepage PostCardV2. Both the avatar and name link to the existing `/members/{id}` view for a named author with a public profile (or the viewer's own profile). Anonymous posts, synthetic homepage previews, and other private/missing profiles do not link. Existing profile route authorization remains in force.
- `FeedQuery::dashboardPosts` now carries the already-loaded author ID and profile presence to the dashboard projection. Anonymous posts explicitly return null IDs and false profile presence. No extra queries or migrations.
- The existing Radix dialog wrapper accepts optional overlay and close classes. Only the composer opts in. A centralized backdrop and layer above the member/public header but below the existing dropdown portal keep the modal and dropdowns usable.
- The composer has a single stylesheet for dimensions and field alignment, explicit Post as/Audience labels, shared 44px targets, a bordered writing field, compact adaptive height, and a scrollable middle region with an always-visible title/submit footer. Touch layouts avoid forced editor focus. Escape handling and busy state protections retained; existing posting, formatting, uploads, polls, audience, moderation, and editor save flows remain in place.
- CSS uses the guide's 18px modal radius, shared Inter typography, dialog title role, control and body sizes, colors, backdrop, shadows and spacing.

Verification: 307 Node regression checks; PHP syntax and direct dashboard projection assertions; 568 TS/TSX sources scanned with TypeScript transpile syntax diagnostics; 14 representative Chromium fixture checks (six viewports, empty/long editor, two post title hover checks). Browser checks use source styles and simulated Radix positioning utilities, not live Inertia or Laravel. No vendor/node_modules in archive; production build attempted and blocked by missing `vp`. Full type-check, live profile navigation, Radix interactions and post submission remain for local verification.

Deploy: replace source files, run `npm run build`, `php artisan optimize:clear`, and refresh. No database migration or new dependencies. Existing build assets preserved until rebuilt.
