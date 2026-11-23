# Shared footer correction (23 November 2026)

## Root cause
The homepage alone used `HomeFooter` and other pages still used the previous `PmpPublicFooter` presentation. As a result, changing homepage footer text or styling did not propagate everywhere.

## Updated behavior
- `SiteFooter` now renders `HomeFooter` consistently on eligible public, member and authentication pages.
- The admin footer preview renders the same shared component.
- Global footer styles use centralized Inter typography, navy background and the guide container, preserving the homepage rail. Responsive rules also cover smaller screens.
- Removed mockup attribution text is not present in the rendered footer.
- Existing footer visibility rules still exclude the dashboard and timed in-progress exam where intentionally hidden.
- Database values, visibility controls, social URLs, payment settings and routes are unchanged.
- Previous footer component is retained for reusable brand/social components and backward compatibility.

## Changed source paths
- resources/js/components/pm/SiteFooter.tsx
- resources/js/components/home/v2/HomeFooter.tsx
- resources/js/pages/admin/SiteFooterEditor.tsx
- resources/css/pm-home-v2-sections.css
- resources/css/pm-home-v2-responsive.css
- resources/css/pm-member-shell.css
- resources/css/pm-member-navigation.css
- resources/css/pm-circle.css
- resources/css/pm-admin.css
- tests/Regression/siteFooterAdminControl.test.mjs
- tests/Regression/universalFooterPrototype.test.mjs

## Verification
- 215/215 runnable JavaScript regression checks passed (Node 22.16 experimental type-stripping).
- One existing Activity Log regression test could not run because it references an HTML style guide absent from the source archive.
- Modified TSX files passed TypeScript transpilation syntax checks; edited CSS files passed parser checks.
- Full npm dependency installation, Vite build and rendered pixel-perfect check not completed here.
- No database migrations or seeders are required.

## Local verification
Run `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear` on Node 22.18+ with existing Laravel `.env` and installed backend dependencies. Check `/`, `/terms`, `/learning`, `/events` and representative member/auth pages.

The full-source package omits transient caches, private environment files, compiled assets and any bundled font data; keep your existing fonts/assets when applying a patch.
