# PM Circle — UI guideline migration (9 November 2026)

## Source of truth

The authoritative style guide is included unchanged as `docs/PM_CIRCLE_UI_STYLE_GUIDE_APPROVED_2026_11_09.html`. Its 65 root variables define the system font, H1–H6 scale, paragraph and UI typography, colors, spacing, radius, input/button sizes, responsive touch sizes, and focus states.

## Implementation

- `resources/css/pm-design-tokens.css`: exact canonical tokens plus backwards-compatible aliases for legacy feature styles. Legacy numerical font sizes resolve to the shared guide type scale.
- `resources/css/app.css`: Tailwind integration, semantic heading defaults, guide line heights, mobile typography and touch controls. Tailwind's `--text-sm`/`--text-xs` values use their literal canonical values to avoid circular CSS references.
- `resources/css/pm-ui-guideline.css`: shared typography, button, form field, focus, invalid input and touch-size rules for existing control families.
- `resources/css/pm-circle.css`, `pm-dashboard-shell.css`, `pm-learning-core.css`, and `pm-site-header.css`: shared family classes and member/public typography inherit canonical tokens.
- `resources/js/components/ui/button.tsx`, `input.tsx`, `select.tsx`: existing shared React/Radix controls use the same typography and control height tokens.

## Preserved functionality and layout

No routes, controllers, query logic, database structures, page content, navigation behavior or page layout components were changed. Approved header/sidebar geometry and existing component placement remain. The supplied guide's example page markup has not been copied over actual PM Circle pages. Decorative gradients and illustration-only colors remain centrally tokenized to avoid rewriting artwork. Standalone email/print templates remain unchanged for renderer compatibility.

Text metrics and semantic theme colors necessarily change because the supplied guide differs from the prior project values. This is the requested migration, not a separate page redesign.

## Verification

- 65/65 authoritative CSS root variables match the guide exactly.
- 33 stylesheets parsed, with no top-level CSS syntax errors or cycles among canonical aliases.
- 316 TS/TSX files parsed without syntax diagnostics.
- Existing feature CSS has no literal `font-size`, `font-family`, or `font-weight` declarations; values are centrally referenced.
- Sample Chromium checks at 1440px and 390px: 28px/24px H1, 20px H2, 15px body, 14px button typography, expected brand colors, 40px/44px control minimums and no horizontal overflow. These are representative static smoke checks, not a complete integrated route-by-route visual regression.
- Full Vite build and Laravel suite: NOT verified. Offline `npm ci` cannot install `yuku-parser@0.19.0`, and dependencies are missing in the provided archive.

## Production verification

With Node.js 22.18+ run `npm ci`, `npm run types:check`, `npm run build`, and `php artisan optimize:clear`. Verify the public homepage, Community Feed, Daily Challenge, Learning, PMP Exam, member dashboard, profile, authentication and PM Trends at desktop and mobile widths before release. No database migrations are required.
