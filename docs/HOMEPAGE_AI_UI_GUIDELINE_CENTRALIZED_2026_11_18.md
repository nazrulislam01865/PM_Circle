# PM Circle homepage AI benefits - centralized UI guideline compliance (18 November 2026)

## Scope

This targeted correction uses the approved `PM_Circle_UI_Style_Guide (4)(8)(3).html` (identical to the approved guide stored in the project). No homepage content, order, routes, APIs, database queries, AI calls, or other page designs have been changed.

The section remains after `HomePathway` (its final item is the professional skills banner) and before `ScenarioPreview` (Today's scenario).

## Canonical controls

- Heading: H2 from `--text-h2` / `--line-h2` / `--bold` = 20/28px at 700.
- Card titles: H3 from `--text-h3` / `--line-h3` / `--semibold` = 18/24px at 600.
- Card categories: H4 from `--text-h4` / `--line-h4` / `--semibold` = 16/24px at 600.
- Descriptions: `--text-body` / `--line-body` / `--regular` = 15/24px at 400.
- CTA: existing `.pm-button` with shared `--blue`, `--blue-hover`, `--text-ui`, `--line-ui`, `--radius-control`, and focus/touch handling. Removed section-specific CTA blue, height, padding, radius and font overrides.
- Icons: `--icon` = 20px.
- Cards: `--surface`, 1px `--border`, `--radius-card` = 12px, and content padding `--s5` = 20px (`--s4` = 16px on small screens).
- Spacing: approved `--s2`, `--s3`, `--s4`, `--s5`, `--s6`, `--s8`, `--s10` scale.
- Width: a reusable `.pm-home-wide-container` uses the same width and mobile breakpoints as the existing `.pm-pathway-container`, avoiding another hard-coded section width.
- Decorative prototype art and blue gradient: preserved, with decorative values and card shadow managed in `pm-design-tokens.css` only.

## Affected files

1. `resources/css/pm-home-ai.css`: changed to canonical type/icon/card/control tokens; removed duplicate CTA styling; standardized breakpoints and spacing.
2. `resources/css/pm-home.css`: shares one homepage wide-container rule with existing pathway content. Existing pathway layout remains the same.
3. `resources/css/pm-design-tokens.css`: removed redundant section CTA and border colors, retained centralized decorative gradient tokens, and consolidated decorative card shadow as one token.
4. `resources/js/components/home/HomeAiFeatures.tsx`: reuses the shared width class and canonical icon sizing (without hard-coded Lucide sizes).
5. `tests/Regression/homeAiBenefits.test.mjs`: strengthened source-of-truth and section-placement checks to prevent future drift.

## Verification performed here

- Targeted `node --test tests/Regression/homeAiBenefits.test.mjs`: **6/6 PASS**.
- React/TSX parser diagnostics (HomeAiFeatures and Home page): **0**.
- CSS parser: **0 errors**; no section-local hard-coded font sizes or hexadecimal colors.
- Guide-token contract compares relevant global typography, spacing, control and color values with the approved HTML guide: **PASS**.
- Prototype text, asset size, placement and local lazy-image contract: **PASS**.
- Chromium page navigation (both file and localhost) is prohibited by this container browser policy; **visual browser verification not completed**.
- `npm ci --offline` was blocked because `yuku-parser@0.19.0` is not cached; **full typecheck/build not completed**. No database migration required.

## Verification after applying to development

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
node --test tests/Regression/homeAiBenefits.test.mjs
```

On the real homepage, inspect desktop (four cards), tablet (two cards), mobile (single column), and interaction/keyboard focus. Verify the existing header, skills banner, scenario, and footer remain unchanged.
