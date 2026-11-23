# About Us: prototype typography and spacing correction (2026-11-23)

## Cause
The previous About Us CSS used compact public-home navigation/body/caption typography and a legal-page H1 instead of the approved HTML design guide's About-page typography. The reduced font scale also shortened the banner, feature cards, and whole page, visibly diverging from the user's left-side reference.

## Scope
- `resources/css/pm-about.css`: use existing PM Circle guide tokens for full body size, lead text, H1/H2/H3, breadcrumb text, banner padding, and the content section gap. Preserve homepage rail width, color palette, card geometry, responsive breakpoints, and exact page copy.
- `tests/Regression/publicAboutPrototype.test.mjs`: add a guard against unintentionally reintroducing compact navigation/caption/legal typography on About Us.

Header, footer, offer bar, other React pages, routes, controllers, data flow, and database are unchanged. No new dependencies, API calls, or database queries.

## Verification
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 240/240 passed.
- `tinycss2` stylesheet parsing: no errors.
- Full Vite build / live browser comparison: not performed; unavailable in this runtime. A Chromium screenshot attempt timed out, so screenshot pixel parity is not claimed.

Rebuild frontend assets after deployment (`npm ci`, `npm run build`, `php artisan optimize:clear`).
