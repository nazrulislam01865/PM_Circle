# About PM Circle — approved public prototype (23 November 2026)

Source: `Archive 8(2).zip`, the user-supplied About Us reference screenshot, and `PM_Circle_Design_Guidelines (1)(10).html`.

## Scope

- Replaced the generic `/about` information panel with the approved breadcrumb/banner, introductory copy, three Learn/Practise/Connect cards, and ITQAN Consulting section. The display copy matches the provided screenshot.
- Reused `PublicLayout`, which already owns the canonical homepage guest header, promotional offer, and shared homepage footer; member navigation remains controlled by the authenticated shell.
- Used existing Inertia `Link`s to `/`, `/learning`, `/simulators`, and `/events`. The “Visit ITQAN Consulting” link opens the verified ITQAN Consulting website (`https://www.itqanconsulting.com/`) in a separate tab, using safe external-link attributes; no application queries are introduced.
- Introduced only About-page-scoped CSS using already centralized design-guide and homepage tokens. Card and content layouts respond to existing breakpoint conventions. No global tokens, header/footer components, PHP handlers, data fetches, migrations or seeders were modified.

## Changed files

- `resources/js/pages/public/About.tsx` — actual About Us page and reusable feature-card renderer.
- `resources/css/pm-about.css` — isolated prototype layout and responsive treatment.
- `resources/css/app.css` — single stylesheet import.
- `tests/Regression/publicAboutPrototype.test.mjs` — page content, shell, links, zero requests, and CSS regressions.

## Verification

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 239/239 pass.
- `php tests/Regression/SharedFooterCoverageCheck.php`: pass.
- TypeScript `transpileModule` syntax validation for About.tsx: 0 errors.
- `tinycss2` stylesheet parse for pm-about.css: 0 errors.
- Full frontend production bundling and a real application browser visual comparison could not be performed in this environment (dependencies are not installed; the headless Chromium binary was unable to complete a screenshot).

## Deployment

1. Deploy the updated source with your normal safe deployment process.
2. Use a compatible Node runtime and install dependencies (`npm ci`), then run `npm run types:check` and `npm run build`.
3. Run `php artisan optimize:clear` and verify the public `/about` route at desktop/mobile widths; check the shared footer and guest/member headers remain correct.

No database changes.
