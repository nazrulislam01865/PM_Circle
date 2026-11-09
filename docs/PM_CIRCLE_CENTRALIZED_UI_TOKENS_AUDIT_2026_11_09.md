# PM Circle — Centralized UI tokens audit (2026-11-09)

## Scope and design freeze

This change centralizes the browser application's existing visual values without redesigning screens. No page text, routing, API, database query, authorization, or feature logic was altered.

**Single source of design values:** `resources/css/pm-design-tokens.css`.

- `resources/css/app.css` imports design tokens before all feature CSS and maps Tailwind colors, font family, radius, and text-size utilities to the shared system.
- `resources/css/pm-circle.css` retains the reusable public primitives (`.btn`, `.pm-button`, `.pm-field`, cards, and typography) but no longer defines its own competing `:root` theme.
- Component/page CSS files retain their selectors and layout behavior. Literal typography, weights, line heights, colors, radii, and control dimensions have been replaced by shared CSS variables.
- React inline style values and arbitrarily sized/colored Tailwind utilities reference the same variables. Responsive font-size expressions also use tokens rather than introducing new values.
- Existing role-based and feature-specific colors remain visually **identical**. They have exact-value palette tokens (`--pm-tone-*`) rather than being forcibly changed to the primary blue. This retains existing designs and allows deliberate consolidation later if approved.

## What is centralized

| Category | Central definition | Intended use |
|---|---|---|
| Branding and theme | `--primary`, `--primary-hover`, `--primary-soft`, `--surface`, `--text`, `--divider`, etc. | Public and member pages |
| Text hierarchy | `--type-h1`, `--type-h2`, `--type-h3`, `--type-small`, `--type-caption`, and exact-value `--pm-font-size-*` | Headings, body, helpers, metadata |
| Font weights and leading | `--type-weight-*`, `--type-line-*`, exact-value weight/leading tokens | All interactive components and text |
| Tailwind text utilities | `@theme` mappings of `text-xs` through `text-6xl` to `--pm-tailwind-text-*` | Existing `text-*` React classes |
| Buttons and form inputs | `.btn`, `.pm-button`, `.pm-field`, existing shadcn/Tailwind classes, and `--pm-control-*` / `--pm-radius-*` | Consistent control sizes, colors, disabled/focus/hover styles |
| Legacy feature palette | `--pm-tone-*`, exact-value color effects | Preserve existing feature accents and gradients |

## Verification performed

- Original shared `:root` variables: **149**; all retained their previous effective computed definitions.
- Existing dark-mode theme overrides: retained.
- PostCSS declaration comparison: **10,608 declarations** compared across the original and updated stylesheets after resolving centralized token values. **Zero value mismatches**.
- **32 CSS files** parsed with no syntax errors.
- **196 TypeScript/TSX files** parsed without syntax errors.
- New design token references: **0 missing**; **0 dependency cycles**.
- The source-only checks cannot establish that the browser output is pixel-for-pixel identical; responsive browser QA after a full build is still required.

## Standalone-renderer exceptions

The following do **not** use normal Inertia/browser `app.css` and have intentionally unchanged inline styles:

- `resources/views/mail/signup-verification-code.blade.php`: HTML emails need inline styling for mail-client compatibility. CSS custom properties are not consistently supported by mail clients.
- `resources/views/profile/resume-export.blade.php`: standalone print/PDF output must remain independent of frontend asset loading and the renderer's CSS-var support.
- `resources/views/profile/resume-preview.blade.php`: independent standalone document preview remains self-contained.
- The initial color flash-prevention style in `resources/views/app.blade.php` remains inline so it works before Vite CSS loads.

Do not replace these with browser CSS variables without testing email clients, printing/PDF and initial page paint. Their preserved style values are deliberate compatibility exceptions, not new page UI designs.

## Build and release

No dependencies, migrations, or environment variables were added. The ZIP does not contain newly compiled frontend assets. Install on a supported Node.js version (22.18+), then run:

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Visually check public home, Community Feed, PM Trends listing/article, member dashboard, profile, learning, exam simulator and result pages, including focus/hover/disabled states and small screens. The Laravel feature suite and production bundle build were not completed in the inspection environment because dependencies were unavailable and its Node.js version was below the installed Vite Plus engine requirement.

For future work: update the shared tokens or shared component primitives, **not** literal font sizes/colors in page-specific CSS. Page styles may still define grid, layout, breakpoints, spacing composition, and other structural rules.
