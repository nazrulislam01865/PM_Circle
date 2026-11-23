# PM Circle — Public community events prototype

## Source references

- Uploaded `image(3).png` and `image(4).png`: identical files, both showing the **Community Events listing**. No separate event-details reference image was provided.
- Uploaded `PM_Circle_Design_Guidelines (1).html`: centralized Inter, palette, type scale, spacing, radius, layout rail, form and button guidance.
- Uploaded `Archive 5.zip`: actual source of truth for the routes, reusable homepage shell, footer, and local photos.

## Delivered

- `GET /events` — listing with two-slide advertisement carousel (working previous/next/pause), local search, format selection, order, 10-per-page pagination, sponsored/event cards, host CTA, and empty state.
- `GET /events/{slug}` — per-event details, metadata, member/guest access labels, and clear preview/registration notice. Unknown slugs return HTTP 404.
- Existing homepage header and footer reuse via `<PublicLayout siteLayout homePrototype guideLayout>`, without creating duplicate headers or footers.
- One typed server-side sample catalog: 13 prototype events. No tables, migrations, event database reads, or booking mutations.
- A `View all events` link in the existing homepage event component, without changing its existing preview dialogs or local prototype creation.
- Events header navigation resolves to `/events` only on the event pages; homepage section scrolling is unchanged elsewhere.
- Central `--pm-guide-*` theme and additional semantic `--pm-event-*` tokens. Page-specific CSS defines layout only.

## Important scope limitation

The two supplied screenshots are byte-for-byte identical and depict the listing page. The **details layout** follows the same approved design tokens, card style, hero/banner, typography, and shared header/footer, but cannot be claimed pixel-identical to a detail-page screenshot that was not supplied. The events and advertisers are explicitly sample data. The UI never records RSVPs, claims to have booked a guest, or charges anyone.

## Files

- `app/Support/Events/PrototypeEventCatalog.php` — event data shared by list and details.
- `app/Http/Controllers/PublicSite/EventPreviewController.php` — safe Inertia index and show actions, 404 for unknown slugs.
- `routes/web.php` — two GET routes.
- `resources/js/pages/events/Index.tsx` — event index and controls.
- `resources/js/pages/events/Show.tsx` — details page.
- `resources/js/components/events/{eventTypes.ts,EventComponents.tsx}` — shared types, date formatter, actions, banner, rows.
- `resources/css/pm-events.css` — scoped event layout.
- `resources/css/pm-design-tokens.css` — semantic event color and dimension tokens.
- `resources/css/app.css` — stylesheet import.
- `resources/js/components/home/v2/{HomeHeader.tsx,HomeEvents.tsx}` — related event navigation only.
- `tests/Regression/publicEventsPrototype.test.mjs` — route, read-only, design and prototype behavior contract.

## Verification performed

- PHP syntax verified for route, catalog, and controller.
- 13 event samples verified by invoking the catalog with PHP CLI; known and unknown slug behavior verified at the catalog level.
- 6 edited/new TSX/TS files transpiled using global TypeScript compiler without syntax errors.
- CSS parsed with `tinycss2` and all 59 referenced guide/event variables were found in the central token file.
- 18 targeted JS regression checks passed (including 4 new ones).
- Wider JS suite: 165 passed, 5 blocked/failed due to missing dependency or style-guide files in the supplied archive; see test output. No new event test failed.
- Full type-check/build and actual browser pixel comparison not completed: `npm ci --offline` failed with missing npm cached packages and installed Node v22.16 falls below required v22.18. `vendor/` also absent, so Laravel feature/integration tests were not runnable here.

## Applying locally

Extract patch over the existing project root, not into an extra subfolder. Do not replace `.env` or run a migration for this change. Run with supported Node version:

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
php artisan route:list --path=events
```

Then test `/events` and a real sample slug, e.g. `/events/pmp-study-circle`. This source package does **not** contain a newly compiled `public/build` directory; the rebuild is mandatory before viewing the changes.
