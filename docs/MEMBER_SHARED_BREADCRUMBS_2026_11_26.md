# Shared member breadcrumbs — 26 November 2026

Base: PM_Circle_Full_Compact_AI_Sidebar_Badges_2026-11-26.zip.

The authenticated MemberDashboardLayout now renders one non-sticky accessible breadcrumb before the page content. A pure route policy resolves the Home-rooted hierarchy from the actual Inertia URL and existing page props. Course, lesson, member, event and challenge detail labels use existing data; no new server request or query is required. PublicLayout supplies its existing banner metadata as a fallback for other member-view content pages.

The new scoped CSS uses central Inter, metadata size, normal weight, semantic blue and muted colors, slash separators and spacing tokens. It hides existing legacy breadcrumb elements only when a shared member breadcrumb is present. Guest and administration layouts and normal section navigation remain unchanged. Unknown routes without metadata retain their existing presentation. Dedicated timed PMP exam-taking and certificate-print views intentionally retain their standalone layouts.

Files: `resources/js/components/dashboard/memberBreadcrumbs.ts`, `MemberBreadcrumb.tsx`, `resources/js/layouts/pm/MemberDashboardLayout.tsx`, `PublicLayout.tsx`, `resources/css/pm-member-breadcrumb.css`, `resources/css/app.css`, `tests/Regression/memberBreadcrumbs.test.mjs`.

Verification: four new regression tests passed, 509/510 overall; the original baseline was 505/506 with the same PMP dashboard test failure. Strict TypeScript checking of the pure resolver, transpile syntax of four changed TypeScript/TSX files, CSS parsing, and six Chromium viewport fixtures (1600, 1280, 1024, 768, 390, 320) passed. Fixtures exercise wrapping, font size/weight, non-sticky positioning and scoped duplicate suppression; they are not an authenticated Laravel application. Full build and live Inertia navigation unverified because dependencies are not installed. Rebuild assets and clear/rebuild Laravel caches. No database changes or additional packages.
