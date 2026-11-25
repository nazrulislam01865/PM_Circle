# PMP workspace centralized typography — 25 November 2026

Base: Archive 2(2).zip. The supplied PM Circle Design Guidelines (1)(3).html is byte-identical to the guide in the archive.

## Root cause and implementation
The workspace used the central 14px control font as its inherited body font; token references alone do not establish the correct semantic type role. All four tabs now inherit the guide body role (16px/1.6/400), card headings use H3 (18px/1.35/700), subtitle text uses 17px/1.6, labels/buttons use 14px/1.35/650, and supporting metadata/tables use 14px/1.6. Existing 24–32px compact member-workspace title role is intentionally retained instead of the public hero H1. Large numerical statistics use the existing 2rem statistic role rather than a responsive heading role. Existing Inter font loading is unchanged. The start dialog uses the guide's 20–24px dialog heading. Actions and filters use 44px minimum controls, and numeric table columns are right-aligned. The chart uses measured SVG dimensions and scrollable dense series to avoid shrinking text with its viewBox. Container-based layouts accommodate the sidebar and narrow widths. No new independent font scale or new dependencies.

## Changed code
- resources/css/pm-pmp-workspace.css
- resources/css/pm-pmp-start-dialog.css
- resources/js/components/exam/PmpWorkspacePanels.tsx
- tests/Regression/pmpWorkspaceTypography.test.mjs
- tests/Regression/pmpExamStartDialog.test.mjs (updated dialog role expectation)
- tests/Regression/memberSidebarPersistence.test.mjs (updated obsolete pre-H1 title assertion)

No backend, database, scoring, billing, AI or authorization changes. Prior reference/concept review changes are preserved.

## Verification
Targeted Node regression tests executed with --experimental-strip-types. Offline Chromium checked the four tab components' initial sample-data markup rendered using a lightweight JSX/hook stub, project CSS imports, minimal preflight stand-in and guideline's embedded Inter fonts, at widths 1440, 1024, 768, 390px. Computed body, headings, tabs/buttons and metadata matched the specified roles; no outer workspace/card horizontal overflow in those 16 scenarios (table/chart own scroll areas permitted). This was not a real Inertia/Laravel session; hooks, chart resize behavior, paid checkout, expanded history, live font fetching and production Tailwind compilation were not executed. npm ci --offline failed because yuku-parser@0.19.0 was not cached, and installed Node 22.16.0 is below the project's Vite Plus minimum 22.18.0. Full type-check/build and live browser regression remain required.

Apply changed-file ZIP to existing project root, then `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear`. No migrations or reseeding needed. Use existing local configuration and secrets.
