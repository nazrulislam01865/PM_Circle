# Post identity hover and Activity Log typography

Source: Archive 6(3).zip and the supplied 24 November HTML design guideline.

## Changes
- Shared PostAuthorLink uses centralized primary blue, underline and circular avatar focus/hover ring; post title navigation and non-hover styling are unchanged.
- Public/member post cards, homepage preview, author sidebar, comments/replies and reaction roster reuse the same identity component. Existing member routes and privacy gates remain authoritative. Anonymous post identity triggers open an accessible privacy notice instead of linking the true author; named non-public author identities show an unavailable notice. Sample cards are not linked to fictitious profiles.
- Comment preview, reply and new-comment responses include an eligible public profile URL using the already-loaded author/profile data. Saved-post author projection includes the existing avatar field. No new queries, endpoints or schema changes.
- Activity Log preserves H1 for the page title, uses H4 (16px) for date group labels and row titles, lead (17px) for subtitle, and metadata/control (14px) for supporting details. Empty state card heading uses H3. Card padding is the 16px standard. Removed duplicate mobile typography and card padding overrides.

## Verification
- 311/311 Node regression checks passed.
- 566 TS/TSX sources parsed with zero syntax errors; changed PHP files passed PHP syntax checks.
- 15 representative Chromium stylesheet fixtures passed: guest/member-style author controls and Activity Log at 320, 390, 768, 1024 and 1680px; privacy dialog fit at the same widths. This is not a live application test.
- Laravel feature tests added but blocked by missing vendor/autoload.php. Production build attempted and blocked by missing vp executable. Full type checking, live navigation and database feature tests remain pending.

## Local rollout
Extract changes, run `npm run build`, `php artisan optimize:clear`, then `php artisan test --filter=PostReactionRosterTest`. Hard-refresh browser. No migration required. Full project retains the original compiled assets until a rebuild; temporary runtime/debug files are excluded.
