# Public page banner and Help Centre

Baseline: Archive 6(2).zip; supplied PM Circle Design Guidelines (1)(8).html matches the repository guideline byte-for-byte.

## Implementation
- `PublicPageBanner` consumes the existing simulator banner styles and central typography, palette, padding and container tokens. `PublicLayout` renders it for guests only; `LegacyPageHeading` retains the existing headings for members and prevents duplicate guest headings.
- Applied to the public exam catalog/details/availability pages, course catalog/details and public learning workspaces, discussions/posts, scenario library/details, members/profiles, events, trends/reports, About, pricing, policies, contact, AI resume preview and Discover PM. Login, password reset entry screens and the public registration step also reuse it. The homepage retains its existing hero; authenticated and protected workflows are not redesigned.
- Help Centre is linked only in the shared public footer, respecting its existing support visibility setting. The public header retains its original navigation and responsive breakpoints. Member navigation is unchanged.
- `/help-center` now serves the same searchable `support/HelpCentre` guide component for guests. Member redirect and member layout are retained. Guests use `/contact`; private request listing, submission, details and screenshots retain the original member middleware and ownership checks. The shared static guide directions were aligned with Courses and Exam Simulator submenus and no longer direct visitors to the removed Project Simulator menu.
- No database migration, new data query, AI request, new route or dependency is needed.

## Verification
- Node source regression suite: 418/419 passed (`node --experimental-strip-types --test tests/Regression/*.test.mjs`). Existing unrelated PMP AI Tokens static assertion fails; its source and test are unchanged from the baseline.
- Three new public banner/support source checks passed. 43 changed TS/TSX files transpile without syntax diagnostics; changed CSS parses; changed PHP files pass syntax lint.
- Chromium offline component fixtures: 36 checks across 320, 390, 768, 1024, 1280, 1360, 1440, 1600 and 2048px for the public banner, long-title banner, guest Help Centre, and member heading preservation. These are component/style fixtures, not live authenticated application tests; icon rendering in fixtures is stubbed. Full frontend build, TypeScript type checking and Laravel integration tests not run (dependencies not installed). New guest Help Centre integration test included.

## Deployment
Keep `.env`, database and storage data. Source archive excludes stale `public/build`, bootstrap cache, session, view, log and devtools runtime files. Use supported Node 22.18+ (22.x), `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear`. Confirm `public/build/manifest.json` exists before visiting pages. No migration required.

## Follow-up: footer-only Help Centre
- Removed the guest header link and its dedicated responsive CSS overrides; public route and footer remain unchanged. Updated regression assertion to require footer-only navigation.
- 13 targeted checks passed; full source suite 418/419, with the same existing exam counter assertion failure. No production build or live browser test performed for this follow-up.
