# Public homepage: prototype V2

Reference: https://pm-circle-homepage-preview.md-islam-aminul.chatgpt.site/

## Scope

- Only the guest public homepage uses the new header/footer presentation. Other public pages and authenticated member navigation retain their pre-existing header, footer and behavior.
- The homepage now composes short, reusable sections from `resources/js/components/home/v2/` with `PostCardV2` in `resources/js/components/community/`.
- Section visibility, customized homepage content, centrally configured footer, admin-uploaded AI card artwork, rewards, live published community content, and membership permission checks are reused.
- Published course previews use one bounded catalog query. The previous scenario-response and jobs homepage queries were removed because the reference does not display those cards.
- Events and empty catalog/community fallbacks are **labelled previews**, not persisted events, courses or posts. Event submission is local-state-only; it does not change the database.
- The site-wide font was switched from Rajdhani to **Inter**, selected by visual comparison with the provided screenshot and configured in `resources/css/pm-design-tokens.css`. The font is loaded using Google Fonts, with system fallbacks. Direct inspection of the prototype source and computed typography remains unavailable, so the exact font identification is unverified. Page-only CSS is divided into layout, sections, and responsive rules.
- Reference imagery loads from the supplied prototype's `/photos/` URLs. Existing self-hosted WebP assets are used on failure. For a fully standalone design, the original prototype photographs should be copied locally and their paths changed in `HomePhoto.tsx`.

## Changed files

- `app/Http/Controllers/PublicSite/HomeController.php`: published course catalog, no unused jobs/replies lookup
- `resources/js/pages/public/Home.tsx`: modular homepage composition and visibility checks
- `resources/js/layouts/pm/PublicLayout.tsx`: optional homepage-only header/footer variant
- `resources/js/components/pm/SiteFooter.tsx`: homepage footer variant routing
- `resources/js/components/exam/PmpPublicFooter.tsx`: export existing reusable brand/social subcomponents
- `resources/js/components/home/v2/*`: hero, navigation, footer, certification/course cards, community, AI/resume, event previews, shared actions and image fallbacks
- `resources/js/components/community/PostCardV2.tsx`: compact reusable post presentation using the real engagement components
- `resources/css/pm-design-tokens.css`: central switch to Inter plus homepage-specific typography dimensions
- `resources/css/app.css`: feature CSS imports
- `resources/css/pm-home-v2-{layout,sections,responsive}.css`: scoped styles
- `tests/Regression/publicHomepageV2.test.mjs`: new static contracts
- `tests/Regression/{homeAiBenefits,homepagePublicRenderAndEditorLayout,activityLogUiGuideline}.test.mjs`: update older contract assumptions for new homepage and existing global font

## Build/deploy checklist

1. On a development/build host with PHP 8.4+ and Node.js 22.18+ (or 24.11+), install frontend dependencies: `npm ci`.
2. Run `npm run types:check` and `npm run build`. Build artifacts **must** be regenerated; the `public/build/` assets in the supplied source archive predate this change.
3. Run the applicable Laravel tests with installed Composer dependencies, e.g. `php artisan test`.
4. Back up the application and current `.env` before replacing files. On the deployment host, update PHP and frontend files together, upload the newly generated `public/build/` directory, and run `php artisan optimize:clear`.
5. Confirm home page at `/`, mobile/tablet rendering, guest/admin header behavior, section toggles, configured footer links, real course links, and post reactions.

No new schema changes, database migrations, AI API changes, queue workers, or subscription entitlement changes were introduced. Do not run destructive migrations or deploy without backup.

## Verification / limitations

- PHP `HomeController.php` lint succeeded.
- Static TypeScript/TSX parse/import checks and CSS parser checks succeeded.
- Node-based regression suite was run; consult handoff summary for results.
- A working React build and browser screenshot comparison could not be completed here: the original archive contains no `node_modules` or `vendor`, frontend dependency installation did not finish, and the available Node 22.16.0 is below the project's current Vite Plus engine requirement.

## 2026-11-21 screenshot alignment revision

- Changed the global UI font-family token to Inter (all Inertia pages and admin). App shell and standalone resume preview/export views request the same font via Google Fonts.
- Home V2 section headings use 22px/28px and hero headings use a 32–36px responsive scale from central CSS variables.
- Certification card photography uses a 2:1 proportion and the content area has a 180px minimum height. Course content card minimum height is 224px on desktop; mobile retains compact dimensions.
- Preserved backend routes, query logic, permissions, community card APIs, admin-managed sections and footer controls.
- **Exact visual parity unverified**: the reference URL is unreachable by the available tools, and original prototype image files/font source have not been supplied. Only the screenshot is available for geometry comparison.
- No schema changes. Rebuild frontend assets on a supported Node host.
