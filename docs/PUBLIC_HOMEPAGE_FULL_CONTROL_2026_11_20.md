# Public homepage section controls — 20 November 2026

## Scope

This update applies only to the public homepage and its existing administration components. It preserves the existing content and routes for registered members, courses, question banks, scenarios, careers, subscriptions, and AI requests.

## Sections

The public homepage is controlled section-by-section using the current admin sidebar: Hero & portraits, Career pathway, AI features, Daily challenge, Community feed, Member preview, Skills sidebar, PM career feature cards, Opportunities & resume, and the Shared site footer.

The AI benefit cards used to be fixed TSX copy. They now read from the same `home_page_contents` JSON document as the other homepage sections. The four approved cards and bundled WebP images are defaults in `config/home-ai-features.php`; admins can change text and upload replacement illustrations. They are still four cards to retain the approved layout. Older stored homepage records obtain these defaults at read time; no migration or reseeding is required.

The Footer menu item links to the **existing shared footer editor** at `/admin/exam-simulator/pmp?section=footer`. This avoids introducing a second footer configuration. The existing `SiteFooter` component is now visible on `/` and `/home`; dashboard and in-progress exam routes remain excluded.

## Editing UI

- Repeatable homepage cards can be expanded individually, leaving a cleaner section editor.
- Existing built-in icons are shown as previews; no built-in icon selector is displayed. An optional uploaded icon overrides the fixed built-in image.
- The four AI cards show their bundled illustration until an optional replacement is uploaded.
- Sections have previous/next navigation, save status, visibility switch (except shared footer), validation feedback, and a consistent save action.
- Homepage card routes now include career-pathway actions, comparison links, skills banner CTA, and member directory CTA. Paths are validated server-side against existing non-admin routes.
- The existing image-upload endpoint, CSRF protection, asset size limits, and optimistic homepage revision checks are reused.

## Data and deployment

No migration or new SQL queries are needed. Content stays in the `home_page_contents` JSON column, and the shared footer stays in the existing PMP public content record. New PHP config must be discoverable by Laravel: clear/rebuild config cache on deployment.

Recommended checks from the project root:

```bash
composer install
php artisan optimize:clear
node --version
npm ci
npm run types:check
npm run build
node --experimental-strip-types --test tests/Regression/homepageFullControl.test.mjs
```

Use the Node version required by the installed project dependencies. Run full feature tests in an isolated PostgreSQL test database before production deployment.

## Verification in this container

- All 119 Node regression tests passed after updating the two tests that intentionally expected the old static AI section and footer-free homepage.
- All changed PHP files passed `php -l`.
- All changed TS/TSX files parsed with TypeScript's compiler parser.
- Full TypeScript checking was attempted but cannot resolve React/Inertia dependencies because `node_modules` is absent. The production frontend build and Laravel integration tests remain unverified because npm and Composer dependencies were not supplied.
- Three existing PHP static contract checks contain pre-existing assumptions that do not match the supplied archive. They were not used as proof of integration success.

The public site and production database were not changed.
