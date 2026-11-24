# Privacy Policy — prototype implementation (24 November 2026)

## Scope
Replaces the existing `/privacy` placeholder with the supplied Privacy Policy prototype. The 11 sections, six information categories, draft-for-review date, and support/terms links are transcribed from the supplied screenshot. No new route, controller, query, dependency, migration or seeder is required. The existing registration policy publication flag and consent versions are not changed. The prototype remains a draft; legal review and factual validation of privacy practices are required before approving it as the published legal notice.

## Design
- `PublicLayout siteLayout homePrototype guideLayout` reuses the approved homepage header, promotion, footer and member workspace behavior. Existing footer copy, including the removal of the old sample-content attribution, is retained.
- The shared `pm-terms.css` layout provides the banner, breadcrumb, contents navigation, reading rail, headings, paragraphs and section separators; the privacy-specific adjustments are scoped to `.pm-privacy-policy-page`. A reusable `.pm-terms-list` class styles the six bullet items using the same central design roles.
- Uses `pm-design-tokens.css` (Inter, H1, legal H2, body/meta, weights, line heights, colors, spacing, radius and rail), already imported by `app.css`. The supplied separate HTML design guideline is byte-identical to the copy inside the input archive. No independent font or palette.
- Semantic sections and native fragment links, keyboard focus styling, and responsive single-column layout. Existing `/contact` and `/terms` links are reused.

## Files
- `resources/js/pages/public/Privacy.tsx`
- `resources/css/pm-terms.css`
- `tests/Regression/privacyPolicyPrototype.test.mjs`
- This document.

## Verification performed
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 260 passed, 0 failed (Node 22.16.0). Targeted Privacy/Terms/Refund checks: 12 passed.
- TypeScript transpileModule: 0 error diagnostics (syntax only, not full type-check).
- `php -l routes/web.php`: passed.
- Isolated Chromium rendering of markup generated from the updated TSX (stubbed React/Inertia layout), using the supplied compiled stylesheet plus updated legal CSS and guide Inter faces: all 11 anchors resolve, 16px / 25.6px Inter body, bullet styling present, no horizontal overflow at 1640, 768, 390 and 320 CSS px. This is not a full Laravel/Inertia runtime or shared-header/footer browser verification; exact full-page pixel parity is not certified.
- `npm run build`: blocked because `vp`/node_modules are absent in the input/environment. PHP runtime feature tests not run (vendor absent). Original compiled assets preserved; rebuild before use.

## Local update
Back up local source and apply the changed-files archive (or use the full project archive). Preserve local `.env` and storage. Use the project's supported Node version (22.18+ in the 22.x line), run `npm ci` if dependencies are missing, `npm run build`, then `php artisan optimize:clear`. Open `/privacy`. No migration or seeding necessary. Do not change legal publication flags or consent versions as part of this design-only update.
