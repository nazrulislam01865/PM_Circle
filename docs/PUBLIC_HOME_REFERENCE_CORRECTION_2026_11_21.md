# PM Circle public homepage — screenshot-reference correction (21 Nov 2026)

## Scope

Baseline: `Archive 2(7).zip` supplied by the project owner. The eight accompanying section screenshots are the visual reference. Changes are restricted to the public homepage's presentation components, central V2 type/layout tokens and self-hosted reference photography. The existing Laravel controllers, migrations, database schema, auth, community actions, course publishing, subscription logic, navigation administration and footer administration are unchanged.

## Root causes addressed

1. `HomePhoto` linked to `/photos` on the external prototype host. In this environment that domain cannot resolve, so fallback photographs differed from the screenshots. Ten visually corresponding, locally served and WebP-optimized crops from the owner-provided section screenshots were added to `public/images/home/prototype/`. Admin-managed images still override those reference defaults.
2. The V2 content rail was capped at 1,050px. Reference screenshots show a centered rail approximately 70.2% of their 2048px screenshot width. The homepage uses a scoped responsive rail token capped at 1,440px.
3. Earlier 32–36px hero text, 22px headings, 13–14px body text and 1,050px-based card dimensions did not follow screenshot proportions. The screenshot-oriented V2 typography, controls, card heights, image ratios and section rhythm now use centrally declared V2 tokens, preserving the global Inter selection present in the baseline.
4. V2 CSS imports were loaded before later legacy site CSS, making homepage rules subject to unwanted overrides. Imports now come last, still before the Tailwind directives, without touching legacy CSS.
5. The offer bar and homepage navigation now stay together during page scrolling; dismissal returns the header to the top. Sample-only warning text is visually hidden but remains available to screen readers; preview dialogs continue to identify unpublished sample events.

## Modified source files

- `resources/css/pm-design-tokens.css` — central public-home typography, dimensions, palette values; original global Inter selection preserved.
- `resources/css/app.css` — import order correction.
- `resources/css/pm-home-v2-layout.css` — hero, header, reward, certification, courses, cards and controls.
- `resources/css/pm-home-v2-sections.css` — community, AI, résumé, events and footer.
- `resources/css/pm-home-v2-responsive.css` — tablet/mobile adaptation and overflow safeguards.
- `resources/js/components/home/v2/HomePhoto.tsx` — self-hosted reference photography.
- `resources/js/components/home/v2/HomeHero.tsx` — reference community slide photo and offer bar emphasis.
- `resources/js/components/home/v2/reference.ts` — local asset registry with fallbacks.
- `resources/js/components/home/v2/HomeLearning.tsx` — visually hidden sample preview notice.
- `resources/js/components/home/v2/HomeCommunity.tsx` — visually hidden sample preview notices.
- `resources/js/components/home/v2/HomeEvents.tsx` — event button label and visually hidden sample notice.
- `public/images/home/prototype/*.webp` — optimized owner-supplied screenshot crops.

## Preserved behavior

- Homepage admin visibility toggles, copy overrides and image overrides remain unchanged.
- Published course links and data, recent posts, daily scenario and member visibility rules are unchanged.
- Post Card V2 retains central live engagement functionality and sample-only read-only actions.
- User authentication, authorization and event preview dialogs remain unchanged.
- Homepage footer still uses admin-configured content and links.
- No migrations, new packages, PHP backend changes or added queries.

## Verification performed

- 28 static source/asset assertions passed, including layout token availability, component presence and 10 photograph sizes.
- The four edited homepage CSS files parse successfully with `tinycss2`.
- HomeController PHP lint passed.
- Reference domain resolution failed; the same environment also blocks local browser navigation, so a full interactive browser/pixel-diff run was **not possible**.
- No Node dependency install was available from local cache. `npm run build`, `npm run types:check`, PHP feature/integration tests and production deployment are **not verified**.

## Build and safe deployment

**Do not deploy the ZIP without generating `public/build`**. Existing compiled frontend assets from the baseline were intentionally excluded because they predate these source changes.

On a development/build machine with a Node version compatible with the project's `package.json` and `package-lock.json`:

```sh
npm ci
npm run types:check
npm run build
php artisan test --filter=Home
```

Review `/` at desktop, tablet and mobile sizes; check header and offer dismissal, arrows, links, filters, post reactions, dashboard auth, admin content, and footer. Only after tests and visual acceptance deploy updated application files **and** the newly compiled `public/build`. On production after backing up your environment and database:

```sh
php artisan optimize:clear
php artisan view:cache
php artisan queue:restart
```

Do not run migrations: none are introduced by this change.

## Fidelity limitations

These screenshots establish a detailed visual target but cannot expose computed CSS, font metadata or working prototype interaction. Accordingly, **exact pixel-for-pixel fidelity is not verified**. The base project already selects Inter globally; the current design keeps that selection. The supplied screenshot crops reproduce the visible card photography but do not constitute the original full-resolution prototype assets. Published courses, dynamic posts, user images, copy overrides and site footer controls can legitimately differ from the static mock content.
