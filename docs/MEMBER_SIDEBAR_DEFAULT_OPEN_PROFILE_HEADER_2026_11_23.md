# PM Circle member navigation refinement — 2026-11-23

## Scope
- Remove the redundant "My profile" text link from the authenticated shared header.
- Preserve the My profile action in the account/avatar dropdown (`DashboardHeader.tsx`).
- Start all four authenticated sidebar groups expanded: Profile & career, Learn & practise, Community, Account.
- Keep native summary interactions to manually collapse and expand each group.
- Leave the public/guest header, offer banner, footer, routes, and all business logic unchanged.

## Changed files
- `resources/js/components/dashboard/MemberCompactHeader.tsx` — remove redundant member profile text link.
- `resources/js/components/dashboard/DashboardSidebar.tsx` — initialize all submenu groups open and manage toggling explicitly.
- `resources/css/pm-member-sidebar-restore.css` — remove obsolete profile-link rules and update explanatory comment.
- `tests/Regression/memberSidebarAndOfferRestore.test.mjs` — assert the new header and submenu defaults.

## Verification
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 234 passing, 0 failing.
- TSX syntax diagnostics for both changed components: passed.
- Full TypeScript typecheck and production Vite build not run (node_modules are not provided in the archive).
- No database migration or seeding required.
