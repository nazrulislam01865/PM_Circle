# PM Circle — Shared Footer Administration (2026-11-20)

## Scope

Only the shared website footer and its administrative editor were changed. No other public homepage section, learning content, exam scoring, checkout, or newsletter processing was modified.

## Single source of truth

- The existing `home_page_contents` record with key `pmp_public` still stores the footer in its `content.footer` JSON object.
- The existing `PmpPublicContent::load()` cached read still serves every public/member footer through the existing Inertia `siteFooter` shared prop.
- New admin routes `/admin/footer` (GET and PUT) live inside the current `auth`, `pm.admin`, and `verified` route group; PUT remains throttled.
- Footer PUT only changes the footer subtree, with existing `revision` optimistic locking, one locking database read, and cache invalidation.
- The existing Homepage Control footer link and the old PMP footer route now lead to one central editor.

## Editor controls

1. Brand/about heading and description (the shared Brand logo remains unchanged).
2. Quick links and support links, including ordering/add/remove and a suggested-route dropdown from existing Navigation master data; manual public paths remain validated by existing route rules.
3. Optional PM Trends and membership shortcuts.
4. HTTPS social network addresses, visible only when provided, and reusable default icon previews with upload/replace/remove controls.
5. Newsletter heading, description, compact description, placeholder, and button text. Submission remains disabled.
6. Display-only payment badge labels and payment section heading. Existing payment processing remains unchanged.
7. Copyright owner (year auto-generated), editable legal links, trademark notice, and optional disclaimer.

The full and compact footer styles use one component and one data source, preserving the site's existing centralized color, typography and spacing tokens. No new dependencies or database migrations are required.

## Files

- `app/Http/Controllers/Admin/SiteFooterController.php`: dedicated editor and footer-only transactional save.
- `app/Http/Requests/Admin/UpdateSiteFooterRequest.php`: admin authorization and payload validation.
- `app/Support/Admin/SiteFooterValidation.php`: footer validation reused by the existing PMP public editor.
- `config/pmp-public.php` and `resources/js/types/pmp-public.ts`: backward-compatible defaults and type fields.
- `resources/js/pages/admin/SiteFooterEditor.tsx`: grouped, accessible footer editor.
- `resources/js/components/exam/PmpPublicFooter.tsx`: render editable content for existing full/compact footers.
- `resources/js/layouts/admin/AdminLayout.tsx`, `resources/js/pages/admin/Homepage.tsx`, `resources/js/pages/admin/PmpPublicPage.tsx`, and `app/Http/Controllers/Admin/PmpPublicPageController.php`: route existing footer controls to the centralized editor.
- `routes/web.php`: admin-only routes.
- `resources/css/pm-admin.css` and `resources/css/pm-contact.css`: narrowly scoped styles using existing tokens.
- `tests/Feature/Admin/SiteFooterManagementTest.php` and `tests/Regression/siteFooterAdminControl.test.mjs`: authorization, validation, cache, non-destructive editing and UI/source regression coverage.

## Checks carried out

- All 125 JavaScript regression tests passed with Node `--experimental-strip-types`.
- All changed PHP files passed `php -l`.
- All changed TS/TSX files passed TypeScript's transpile syntax diagnostics.
- Full Laravel feature tests were not executed: the uploaded project has no Composer `vendor` directory.
- Full TypeScript and production Vite build were not completed: offline npm installation failed because one package was not cached, and the available Node runtime is 22.16 while this project requires 22.18 or 24.11+.
- Some older, unrelated PHP static tests already fail against this source; these were not modified.

## Local deployment

Run on an existing working PM Circle checkout after applying the changed files:

```bash
composer install
npm ci
php artisan optimize:clear
php artisan test --filter=SiteFooterManagementTest
npm run types:check
npm run build
```

No migrations or new server environment variables are required. A frontend rebuild is necessary; the bundled `public/build` folder contains the pre-existing compiled assets, not this changed source.
