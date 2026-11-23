# PM Circle — Community event details prototype and Events navigation

Date: 2026-11-23
Source: user-provided Archive 6.zip, supplied event-detail screenshot, and PM_Circle_Design_Guidelines (1).html.

## Scope

- `/events` retains the 13 sample listings, search, format filter, sorting, advertisement carousel, and pagination.
- The shared homepage header Events link now always navigates to `/events`, including from the homepage and other public pages. The default shared footer Events link does the same; administrator-customized links remain handled by existing footer logic.
- `/events/project-delivery-career` now matches the approved detail prototype structure: breadcrumb and hero banner, sponsored-event image, event information, organizer/publisher, agenda, speakers, local venue preview and external map link, related events, public discussion, and a right-column guest registration preview.
- Events use the same existing `PublicLayout`, `HomeHeader`, and `HomeFooter` as the public homepage. The event-only content rail is consistent with the homepage screenshot and responsive on narrower screens.
- The provided screenshot's map is a locally stored, cropped preview image, not a live location API. Clicking it (or the map text link) opens Google Maps in a new tab.
- The event in the prototype has a linkable second related-event preview without increasing the approved 13-item listing.

## Prototype behavior and privacy

The screenshot explicitly labels registration as a browser-tab prototype. Guest registration accepts a full name, valid email, phone number, and optional role, with browser-native validation and supplementary phone-digit validation. Submission displays a clearly labeled preview status. No booking, email, persistent registration, or payment occurs and no registration data is transmitted to a server.

The public discussion includes the screenshot's example comment for the featured event only. New sample comments remain in React component memory for that page and are never sent to or published on the server. The form validates nonempty name/comment values and enforces input length limits. Switching events resets draft and comment state.

For events marked for members only, the sidebar shows a Join PM Circle link, not an open guest registration form.

For a production-ready real registration/discussion workflow, the platform needs an approved persistence and moderation specification, migrations, server-side authorization/validation, notifications, anti-spam and privacy controls. None was introduced in this presentation-focused change.

## Changed source files

- `resources/js/pages/events/Show.tsx` — new detail-page structure and local prototype forms
- `resources/js/pages/events/Index.tsx` — event-only consistent homepage rail
- `resources/js/components/home/v2/HomeHeader.tsx` — direct Events list navigation
- `resources/js/components/home/v2/HomeFooter.tsx` — default Events footer navigation
- `resources/js/layouts/pm/PublicLayout.tsx` — optional, event-scoped shell class
- `app/Http/Controllers/PublicSite/EventPreviewController.php` — provide static related-event previews
- `app/Support/Events/PrototypeEventCatalog.php` — curated prototype related data, retaining 13 listed events
- `resources/css/pm-events.css` — responsive detail sections using approved guide variables
- `resources/css/pm-design-tokens.css` — shared event-specific aspect-ratio tokens
- `public/images/events/agargaon-venue-preview.webp` — reference-provided venue map thumbnail
- `tests/Regression/publicEventsPrototype.test.mjs` — expanded focused regression coverage
- `tests/Regression/publicHomeLayoutCentralization.test.mjs` — assert new Events link destination

## Verified checks

- PHP syntax on both modified backend files: PASS.
- Static catalog lookup: thirteen listed events; requested featured and two related detail slugs resolve; unknown slug returns null, allowing existing controller 404: PASS.
- Modified TSX files parsed/transpiled using installed TypeScript: PASS.
- Event CSS parsed using tinycss2: PASS.
- All referenced `--pm-guide-*` and `--pm-event-*` tokens are centrally defined: PASS.
- Targeted JS tests: 10/10 PASS.
- Full JS regression suite: 195/195 PASS using `node --experimental-strip-types --test tests/Regression/*.test.mjs` and a temporary symlink to the existing `pmDoc/PM_Circle_UI_Style_Guide (4)(8).html` for an unrelated test that expects it at repository root. The symlink was removed afterward.
- Full Vite compile/TypeScript project check: NOT VERIFIED, because the supplied archive does not include node_modules and the local Node.js version is 22.16.0 (below this project's Vite minimum).
- Browser pixel-comparison: NOT VERIFIED; headless Chromium did not complete rendering in this environment.

## Deployment / local verification

No migration or data update required. Preserve `.env` and any stored user data. Apply the patch at the project root, then on Node.js 22.18+ or another supported version:

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
php artisan route:list --path=events
```

Check desktop and mobile at `/events` and `/events/project-delivery-career`. Rebuild assets to avoid serving the previous Vite manifest. Avoid using `migrate:fresh` or deleting any existing records.
