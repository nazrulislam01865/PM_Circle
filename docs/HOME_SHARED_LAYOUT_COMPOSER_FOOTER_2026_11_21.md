# PM Circle public-home layout, composer icon and footer correction

Source: the user's `Archive(8).zip`, November 21, 2026. Only the requested public-home layout, discussion icon, central design tokens, and homepage footer presentation were changed. No database migrations, routes, controllers, authentication, feed mutation logic, or admin form updates.

## Root causes

1. Public homepage V2 used a `70.2vw`/`90vw` responsive content rail independent of the `1480px / 32px gutter` shared by other public pages. This caused sections, header, and footer to appear misaligned.
2. The homepage discussion composer used Lucide `Plus` rather than the prototype's pencil icon.
3. Homepage footer links were classified only from `explore_links`, causing default support links to appear in the wrong column, and the built-in link ordering/labels diverged from the prototype. The footer should remain controlled by the existing shared admin footer settings.
4. Most home typography was tokenized, but four desktop values and mobile overrides remained hardcoded outside the central token file.

## Implementation

- `resources/css/pm-design-tokens.css`: shared `--pm-public-layout-max-width` and `--pm-public-layout-gutter` (same values as the established public `.pm-container`), plus typography tokens for homepage header, resume, event dates, footer brand, and mobile type scales.
- `resources/css/pm-prototype.css`: consume the shared public width/gutter tokens without changing other pages' computed dimensions.
- `resources/css/pm-home-v2-layout.css`: make the public-home container use the shared page width; fix a non-matching selector for the page shell; consume the brand font-size token.
- `resources/css/pm-home-v2-sections.css`: replace remaining literal homepage font sizes with tokens; retain five-column footer grid and horizontal circular social links.
- `resources/css/pm-home-v2-responsive.css`: match the shared tablet and mobile gutters; reference mobile typography tokens; retain responsive card/footer behavior.
- `resources/js/components/home/v2/HomeCommunity.tsx`: change `Plus` to `Pencil` without changing click handler, permission checks, or discussion flow.
- `resources/js/components/home/v2/HomeFooter.tsx`: keep the five-column prototype structure and administrator-controlled visibility; group valid configured links by section, deduplicate them, preserve customized labels, and use native anchor links for existing homepage sections. Keep admin-configured payments, social links, legal text, and brand content.
- `resources/js/components/pm/SiteFooter.tsx`, `resources/js/layouts/pm/PublicLayout.tsx`, `resources/js/pages/public/Home.tsx`: pass the existing AI/events section visibility to footer links, avoiding links to hidden homepage sections.
- `tests/Regression/publicHomeLayoutCentralization.test.mjs`: new static checks for shared widths, pencil composer, centralized type sizes, and admin-aware footer.
- `tests/Regression/publicHomepageV2.test.mjs`, `tests/Regression/publicHomeScreenshotParity.test.mjs`: update outdated expectations for the newly approved shared-width/footer behavior.
- `storage/logs/.gitignore`: preserve an essential Laravel runtime directory during ZIP extraction.

## Verification

- Node regression tests: **170 passed, 0 failed** using `node --experimental-strip-types --test tests/Regression/*.test.mjs`.
- Changed React TypeScript/TSX files: syntax parsed successfully by TypeScript.
- Affected stylesheets: parsed successfully with `tinycss2` (no top-level syntax errors).
- Database: no changes.
- Build: not completed in this environment because `vendor/` and `node_modules/` are not installed. No claim of production build or pixel-level browser verification.

## Build/deploy on the developer workstation

Use a supported Node version (>=22.18, preferably Node 24), PHP 8.4 and the project's configured `.env` and Composer dependencies:

```
nvm use 24
npm ci
php artisan wayfinder:generate --skip-database --with-form
npm run types:check
npm run build
php artisan optimize:clear
```

The ZIP contains source code but no stale `public/build` output. Compare the rebuilt public homepage at the same browser viewport width/zoom with the supplied screenshots before production deployment. The footer links and payment methods reflect the actual administrator configuration; the prototype screenshot contains sample content and links not all backed by routes in this snapshot.
