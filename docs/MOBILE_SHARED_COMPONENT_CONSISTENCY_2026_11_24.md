# Mobile shared component consistency — 24 November 2026

Baseline: Archive 4(3).zip. The supplied PM Circle HTML design guideline and existing centralized tokens remain the design authority.

## Changes
- Shared Pagination, LinkedPagination and AdjacentPagination controls: common accessible previous/next chevrons, active page, disabled state, 44px minimum target, rounded outline controls and bounded client page windows. Adopted by events, course catalogs, scenario library, members, careers, saved posts and admin lists. Existing server URLs, query parameters and client handlers remain in use. Cursor-based load-more controls remain separate.
- Real public homepage posts and authenticated/public feed posts use PostEngagementActions with the same reaction label, picker, colored reaction marks and tappable reaction count. Counts are no longer duplicated or underlined on mobile. Preserve updated breakdowns in feed state. Below 768px show reactions/count and comments; other supported actions remain in the header overflow menu. At widths up to 376px use the accessible icon-only reaction button and one summary mark to fit the row.
- Scenario details and homepage scenario/sample previews use a shared overflow component for their secondary actions. Existing scenario-specific interaction and guest access behavior retained. Scenario reaction counts use their existing API; no new scenario user-roster endpoint is provided. Real community posts continue to use the existing reaction roster.
- Homepage and catalogue event rows share the responsive date/copy/action grid. Date tile remains left; mobile CTA sits below the event copy. Homepage event heading actions are grouped in normal flow. Homepage sample events retain their existing preview-only creation behavior.
- Homepage signup banner stacks at mobile widths; resource cards avoid narrow stretched columns. Member feed tabs scroll inside their own rail; post gaps are normalized. Member directory cards are separated, with responsive actions. Profile learning/contributions heading and link stack, metrics remain flexible and profile completeness spacing is tightened.
- Standard cards, controls and pagination intentionally share design values across desktop and mobile; unrelated desktop layouts, text, auth and application logic are unchanged. No new backend endpoints, migrations, dependencies or queries.

## Verification
- 304/304 Node regression tests passed, including five new tests. Four prior static assertions updated to reflect the requested shared controls.
- 565 TS/TSX files (excluding declarations) transpile without syntax diagnostics; this is not a complete TypeScript typecheck.
- 88 CSS files parse successfully with PostCSS.
- 65 isolated Chromium stylesheet/layout cases (five fixtures across 13 widths) and 50 additional cases (five fixtures across 10 widths) passed. Fixtures use the project stylesheets and representative markup; they do not execute full React/Inertia routes or validate live API interactions.
- Production build attempted, failed because `vp` is unavailable in this environment. Live Laravel routes and interactive behavior require local verification.

## Apply
Extract the complete project or changed-files archive, run `npm run build` and `php artisan optimize:clear`, then hard-refresh. Existing compiled frontend assets in the full ZIP must be rebuilt. The full archive excludes macOS metadata, temporary sessions, compiled views and Inertia debug snapshots, not application source or data migrations.
