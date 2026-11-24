# Member sidebar icons and typography

Source: Archive 6.zip and its included PM Circle Design Guidelines HTML.

## Root cause and scope

`DashboardSidebar.tsx` already renders Lucide icons for all destination rows and the Exam Simulator disclosure. The restored-sidebar stylesheet intentionally hid `.pm-member-nav-icon` in expanded mode (an earlier text-only navigation implementation). The icons were not missing from the React component. The font was already token-based, but the old dashboard shell and its breakpoints retained redundant row font, padding, label and lock rules; brand typography also had legacy rules.

The shared `pm-member-sidebar-restore.css` is now the sole owner of navigation-row styling. Icons use `--icon` (20px), labels inherit the row's explicit `--pm-guide-font`, `--pm-guide-text-control` (14px) and `--pm-guide-line-control` (1.35); active rows and group labels use the approved bold token. Row minimum height is `--control-height` (44px). Brand title and subtitle use existing brand/metadata roles. Labels may wrap rather than overlap icons. Older competing navigation declarations were removed from `pm-dashboard-shell.css` and `pm-dashboard-responsive.css`.

Expanded desktop and mobile drawers display icons plus labels; collapsed desktop displays icons and logo only. Existing group disclosure, active state, persistence, Help Centre, exact menu labels and routes, and the Plus/Pro lock on the entire Exam Simulator group (PMP and Scrum/CSM only) are unchanged. Group titles remain disclosure headings, not extra destinations. No TSX or backend changes were needed.

## Verification

- Baseline regression suite: 335/335 passed.
- Updated regression suite: 337/337 passed (two new icon and typography regression checks). This includes the existing project-wide typography source checks for all 87 React pages and 91 CSS modules.
- 32 isolated Chromium layout cases using recursively inlined project CSS, representative sidebar markup derived from the actual navigation data, and the guide's embedded font for offline testing. Expanded desktop at 961, 1024, 1100, 1240, 1440 and 1680px; collapsed at 961, 1024, 1440 and 1680px; drawer at 320, 360, 390, 540, 768 and 960px; Free and paid variants for each. All passed icon visibility/20px size, 14px Inter font declaration/18.9px line height, minimum 44px row height, label visibility, logo fit, lock visibility and row overflow checks. SVG stand-ins were used to test geometry, not actual React rendering or icon artwork.
- `npm run build` attempted: `vp: not found`. Full live Laravel/Inertia navigation and actual font delivery remain unverified. Existing compiled assets are not rebuilt; run the production build locally.

## Apply

Merge the changed files, run `npm run build` and `php artisan optimize:clear`, then hard refresh. No migration, new dependency, API or query change. The full source archive omits macOS metadata, generated framework caches, session and debug snapshots, and logs; existing storage data and unrelated source files are retained. Do not overwrite the installed environment or live storage with the full archive.
