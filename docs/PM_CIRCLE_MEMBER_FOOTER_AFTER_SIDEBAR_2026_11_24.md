# Member footer after the complete sidebar — 2026-11-24

## Requirement
Authenticated PM Circle pages must show the approved homepage footer **below** the full member sidebar and page content, never beside or behind the sidebar. Keep the homepage footer design, wording, component, and data source intact.

## Root cause
`pm-member-sidebar-restore.css` placed `.pm-v2-site-footer` in the right-hand grid column (`grid-column: 2`), while `.pm-member-restored-sidebar` had a viewport-fixed height. On short pages the footer began next to the sidebar before the expanded sidebar menu ended.

## Implementation
- `resources/js/layouts/pm/MemberDashboardLayout.tsx`: introduce a bounded `.pm-member-content-frame` around the existing shared `DashboardSidebar`, `MemberCompactHeader`, and page workspace. Render the unchanged `SiteFooter` after that frame.
- `resources/css/pm-member-sidebar-restore.css`: root shell now stacks offer bar, member frame and full-width footer vertically. The frame remains a responsive two-column grid on desktop, and the sidebar's natural expanded-menu height participates in its layout. The desktop sticky sidebar cannot enter the footer because it is bounded by the member frame. Preserve the fixed, scrollable drawer on narrow viewports.
- `tests/Regression/memberPublicRailFooterGrid.test.mjs`, `memberSidebarAndOfferRestore.test.mjs`, and `memberNavigation.test.mjs`: replace obsolete right-column footer expectations with the approved after-sidebar structure.

No new database queries, dependencies, migrations, or changes to the footer component/text, navigation labels, or authentication logic.

## Verification
Node regression suite: see fresh local test output. Browser rendering / pixel parity and a frontend production build remain unverified in this environment.
