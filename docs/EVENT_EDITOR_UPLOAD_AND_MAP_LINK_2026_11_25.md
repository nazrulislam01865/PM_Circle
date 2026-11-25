# PM Circle — Event editor usability and map link

Based on the previously delivered dynamic events archive and the supplied admin, public in-person and public online reference screenshots. The public event layout, registration rules, publishing and discussion moderation are unchanged.

## Changes
- Shared `EventEditor` (admin create/edit and member submission) now groups event information, schedule/organizer, conditional in-person location, event cover, agenda, speakers and access. Description counters and field-level errors/hints use existing design tokens. Existing buttons and labels retain the shared admin/public classes.
- Existing `PMDropdown` replaces the native selects in the event editor, public listing filters and admin status filter. No new dependency or additional filter request is introduced.
- New reusable `ImageUploadField` selects one JPG, PNG or WebP file locally, provides drag/drop, a preview, clear/replace/remove/undo controls and validation feedback. Blob URLs are revoked on change/unmount. Existing upload validation (5 MB and 6000px per dimension) remains authoritative. The chosen image is submitted with the existing event form, not uploaded through a new endpoint. The shared `ProgressBar` displays upload progress. Existing saved images are removed only when the form is successfully saved; replacements take precedence over removal. Switching the event to online clears venue media/link at save.
- In-person events gain an optional Google Maps share link. Backend validation permits HTTPS Google Maps URLs on supported Google Maps hosts/paths, including `maps.app.goo.gl`, `www.google.com/maps/...`, `maps.google.com`, and legacy `goo.gl/maps/...`. No external link fetching or map API is added. Public location preview and Open in Google Maps use the stored link; a venue/address search remains the fallback. Online events retain the existing no-location layout. Map preview is still an optional uploaded image rather than a live map embed.
- Registration, publication, sponsorship and discussion logic remain unchanged. No additional database query or dependency introduced by these controls.

## Database
New additive migration `2026_11_25_000002_add_map_link_to_community_events.php` adds nullable `map_link` to `community_events`. The previously delivered migration is unchanged. Existing events/registrations/comments remain intact. Do not run migrate:fresh.

## Verification
- Full source-level Node regression suite: 350/350 passed (includes two added checks).
- PHP lint: 6/6 changed/new PHP files passed.
- TS/TSX transpile syntax: 6/6 passed. CSS token references and stylesheet parsing checked.
- A Laravel feature test covers persistence, invalid URL rejection, admin edit/public props, removal of saved cover and online format cleanup. Not executed here: dependencies absent and Composer unavailable. Full TypeScript typecheck, Vite build, DB migration and visual browser verification are not completed.

## Local update
Keep `.env`, existing database, uploaded storage and dependencies. Use the project's required Node version and run `php artisan migrate`, `npm run types:check`, `npm run build`, `php artisan optimize:clear`, and `php artisan test --filter=CommunityEventTest`. Use `npm ci`/`composer install` if dependencies are missing. Run `php artisan storage:link` only if the public link is missing. No production changes were made.
