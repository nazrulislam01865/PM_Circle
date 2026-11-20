# PM Circle: Shared footer — completed visual controls

Scope: only the shared footer admin editor, its rendered shared footer, types, validation, styling and relevant tests. No homepage, payment, newsletter-service or database schema changes.

## Previous implementation gaps

The previous `/admin/footer` editor controlled about text, link lists, social URLs/icons, newsletter copy, payment labels, and legal copy. It did not expose footer brand artwork/name/byline, per-section visibility, payment logo uploads, or a preview of the complete footer.

## Added

- Footer-only name, byline, and uploaded logo. Existing built-in PM Circle mark remains the default; shared header branding is unchanged.
- Reusable visibility toggles for brand, about, quick links, support links, socials, email updates, payment badges, and copyright/legal sections. The email entry controls have a separate display toggle.
- Upload/replace/remove for payment-badge logos; the existing text badge is preserved when no image is set. Payment gateway behavior is untouched.
- Preview of the full rendered footer, showing unsaved changes.
- Responsive grid adjustment only when footer columns are hidden; the original four-column appearance remains the default.
- Shared server validation for the uploaded footer brand and payment logos; external image URLs and unsafe paths are not accepted.
- Regression and Laravel feature tests for new options, validation and preservation of unrelated PMP content.

## Implementation details

The existing `home_page_contents` row `pmp_public` and `PmpPublicContent` cache remain the single source of truth. The editor uses `ContentField`, `RepeatableItems`, `HomepageImageUploader`, and the same route-selection controls backed by Navigation Master Data. The controller and shared footer cache read were not changed; no new database queries or migrations are required.

### Files changed

- `config/pmp-public.php`: defaults preserving existing footer appearance.
- `resources/js/types/pmp-public.ts`: extended footer contract.
- `resources/js/pages/admin/SiteFooterEditor.tsx`: visibility, brand, logos, preview.
- `resources/js/components/exam/PmpPublicFooter.tsx`: render controls for full and compact footer.
- `app/Support/Admin/SiteFooterValidation.php`: strict validation of new controls.
- `resources/css/pm-admin.css`: scoped editor layout and visual controls.
- `resources/css/pm-contact.css`: scoped uploaded-brand/payment sizing and responsive hidden-column layout.
- `tests/Feature/Admin/SiteFooterManagementTest.php` and `tests/Regression/siteFooterAdminControl.test.mjs`: new coverage.

## Important limitations

Newsletter sign-ups stay disabled: the UI displays an email field and Subscribe button only when enabled for display, but no subscriber storage, email delivery, or newsletter integration has been introduced. Payment logos are display-only, not payment provider configuration. Full frontend build and Laravel feature tests require a local environment with Node and Composer dependencies installed.

## Local verification

```sh
php artisan optimize:clear
php artisan test --filter=SiteFooterManagementTest
npm run types:check
npm run build
node --experimental-strip-types --test tests/Regression/siteFooterAdminControl.test.mjs
```

Before production updates, back up the existing database and storage, check the local build and tests, and deploy the rebuilt frontend assets. No migration required. No production deployment performed.
