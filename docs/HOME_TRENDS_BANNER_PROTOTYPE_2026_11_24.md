# Homepage Trends promotion — 24 November 2026

## Scope
Added a dedicated `HomeTrends` component immediately after AI Resume Assistant and before Community events on the public homepage. The existing career section visibility setting remains unchanged; the independent Trends promotion does not disappear when career content is disabled. No admin controls or database changes were added.

## Design
The supplied screenshot and uploaded HTML guide are the reference. The guide inside the ZIP is byte-identical to the separately supplied guide. The section uses the shared homepage rail (`pm-v2-container`), `HomePhoto` with its existing local leader photograph and fallback, and `HomeAction` linking to `/pm-trends`. Its display-heading size, photo overlay, crop, spacing, minimum height and reading width are controlled by new semantic promotion tokens in `pm-design-tokens.css`; existing global values were not changed. Body, button, colors, border radius and font family inherit the shared design system. Mobile stacks the action below the copy.

## Verification
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 279 passed, 0 failed (276 existing + 3 new).
- TypeScript transpile/syntax diagnostics passed for changed TSX files.
- Isolated Chromium render of the neighboring homepage components and banner, using the current source CSS and supplied guide font definitions: 1664, 1050, 768, 390 and 320px widths; no horizontal overflow, matching adjacent rail bounds, image loads, correct link. Desktop banner height 196px, title 36px, body 16px, button 44px.
- Production build attempted; blocked by missing local Vite Plus executable (`vp`). Full Laravel/Inertia runtime and exact live visual parity not verified.

## Deployment
Extract changed source files and run `npm run build` followed by `php artisan optimize:clear`. No migrations or seeding needed. Existing compiled assets remain unchanged until rebuilt.
