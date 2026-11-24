# Community and scenario guideline parity — 2026-11-24

Source: `Archive 2(3).zip` and the supplied `PM_Circle_Design_Guidelines (1)(20261124-093559).html`.

## Scope and findings

Community Feed, Scenario Library and Scenario Detail used the existing shared Inter design tokens, but some selected incorrect roles or bypassed the shared control contract. Specifically: the detail H1 used the statistic size; scenario list summaries used metadata sizing; scenario sidebar card headings used the section-heading size; the community search used body sizing (including a member-specific rule); the desktop feed tab differed from the mobile and library tab sizes; the detail sort button set 40px inline. Standard field borders, focus and validation were inconsistent. Profile card padding leaked into scenario response content. A shared field validation selector had insufficient specificity against the default control rule.

## Corrections

- Existing semantic tokens: responsive H1 32–49.6px, H2 24–32px, H3/card 18px, H4 16px, lead 17px, body 16px/1.6, metadata and standard controls 14px, standard minimum control height 44px, radius 8px, border #7c91ac, error #a82130. H1 uses the existing approved static Inter weight fallback of 700. No changes to the centralized token definitions.
- Community hero, feed tabs, guest fields, sidebar titles, CTA and shared post typography use the correct roles. Member-specific and mobile typography overrides now match the same roles.
- Scenario Library title, subtitle, filter controls, summary, card titles and reset action use central tokens. Native checkbox/radio dimensions remain distinct from text fields.
- Scenario Detail title, sections, sidebar card headings, metadata, response area, feedback content and related-scenario links use appropriate centralized roles. Inline sorter height and typography overrides removed. Scenario response textarea starts at the existing 110px height and preserves vertical resizing. Its error state is exposed with aria-invalid. Facts display their list markers; response cards no longer inherit profile card padding.
- Existing shared headers, footers, public content rail, member shell, navigation, components, routes, content, and business logic retained. No DB, AI, query, or dependency changes. Broken media in screenshot is not addressed by this typography task; uploaded media availability requires separate runtime investigation.

## Verification

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 293 passing, 0 failing (290 existing checks including updated legacy expectations, 3 new checks).
- PostCSS parsing: 87 stylesheets, no errors. TypeScript parser: 562 TS/TSX files, no syntax errors. Central token dependency scan: 1,233 tokens, no cycles.
- Isolated Chromium computed-style checks: 3 representative page DOM fixtures × guest/member wrapper × 320, 390, 768, 1024, 1680 widths = 30 cases. All passed heading, card, body, metadata and control sizing, invalid field border, guest header/content rail alignment and overflow checks. These are stylesheet fixtures with representative page classes and minimal reset, not fully mounted React/Inertia routes or pixel-perfect comparisons. Font stack verified; actual font loading and complete real-data rendering require local verification.
- `npm run build`: unavailable because `vp` executable is not installed in the supplied runtime. Existing compiled assets are retained, so rebuild before evaluating or deploying.

## Files

- resources/css/pm-circle.css
- resources/css/pm-daily-challenge.css
- resources/css/pm-feed-scope.css
- resources/css/pm-member-pages.css
- resources/css/pm-mobile-content-polish.css
- resources/css/pm-ui-guideline.css
- resources/css/pm-unified-post-card.css
- resources/js/components/scenarios/ScenarioDetailsAside.tsx
- resources/js/pages/community/Feed.tsx
- resources/js/pages/scenarios/Show.tsx
- tests/Regression/communityFeedGuideTypography.test.mjs
- tests/Regression/communityScenarioGuideParity.test.mjs
- this report

## Local application

Use the changes ZIP to overlay existing sources or the full project ZIP. Keep the local `.env`, dependencies and existing storage data. Run `npm run build`, `php artisan optimize:clear`, and a browser hard refresh. No migration is required. Validate guest and signed-in versions of the three pages with real data.
