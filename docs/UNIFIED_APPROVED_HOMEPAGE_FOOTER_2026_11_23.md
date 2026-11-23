# PM Circle - canonical approved homepage footer

Source: Archive 3(1).zip; approved homepage footer is the only visual footer.

## Architecture

- `HomeFooter` is the only footer renderer; `SiteFooter` reads cached, shared Inertia `siteFooter` props.
- Legacy `PmpPublicFooter` remains as an API compatibility wrapper around `HomeFooter`. It cannot render the old layouts.
- `FooterIdentity` holds reusable brand/social components; no cyclic imports.
- Public, learning, legal, event, auth, member and discover shells use `SiteFooter`. Existing dashboard/timed-exam footer exclusions stay intact.
- Footer content rail aligns with the page's homepage/guide/event/learning rail. The five columns, payment row and approved footer copy are unchanged.
- Shared admin footer settings, visibility toggles, media, routes, backend and database remain intact.

## Checks

- `node --experimental-strip-types --test tests/Regression/*.test.mjs` - 218 pass / 1 blocked because the archive does not contain an unrelated Activity Log reference HTML file.
- `php tests/Regression/ContactPageAndFooterStaticCheck.php` - pass.
- `php tests/Regression/SharedFooterCoverageCheck.php` - pass.
- Changed TSX files pass independent TypeScript transpilation/syntax check; edited CSS parses without errors.
- Full production build and browser screenshot comparison are not verified in this environment: installed Laravel/npm dependencies are absent.

## Deployment

Extract into existing Laravel project without overwriting `.env` or user media. Ensure Node and Composer dependencies are installed, then run `npm run types:check`, `npm run build`, and `php artisan optimize:clear`. No migrations or seeding. Browser hard refresh required after the build.
