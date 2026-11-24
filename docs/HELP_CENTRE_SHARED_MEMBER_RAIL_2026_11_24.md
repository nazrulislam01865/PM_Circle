# Help Centre shared member content rail

Base: PM_Circle_Sidebar_Persistence_Exam_Navigation_Full_Project.zip (the latest previously delivered project). No new source archive was supplied with the screenshots.

## Root cause and changes

- The Help Centre already uses AccountPage and MemberDashboardLayout. The guide article and related guides cards nevertheless used `.pm-account-reading`, limiting them to the centralized 47.5rem (760px) reading measure while the support panel occupied the member rail.
- Remove that opt-in width restriction from guide and related cards and the Contact support form. The shared account wrapper now explicitly consumes the available width; the member shell remains the sole owner of the page rail. Keep the compact resume task panel unchanged.
- Help index/search, individual guides, contact form, request list and request details use the same member shell and content rail as Plan & usage. Existing guide content, typography roles, search, form controls, support actions and member navigation are unchanged.
- No backend, database, dependency, header, sidebar or footer changes.

## Verification

- 332/332 Node regression tests passed, including the new full-rail guard.
- 98 isolated Chromium JSX/layout cases (7 states x 7 widths x 2 desktop sidebar preferences), at 320, 390, 768, 960, 1024, 1440 and 1680px. Actual page JSX was rendered with mocked React/Inertia dependencies and a representative member shell using the actual project CSS. Checked content edges, card padding, responsive grids, footer/workspace alignment, sidebar width and horizontal overflow. At 1680px the guide article, related guides and support panel all measured 1179.36 CSS pixels wide, matching the shared rail. This is not a live application test.
- Production build attempted: `vp: not found` (dependencies not installed). Full live Inertia verification is pending.

## Apply

Merge the changes, run `npm run build` and `php artisan optimize:clear`, then refresh the browser. No migration needed.
