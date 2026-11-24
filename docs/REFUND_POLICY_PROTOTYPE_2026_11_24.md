# Refund Policy — 24 November 2026

## Scope

Replace the placeholder at `/refund-policy` with the supplied four-section policy prototype. The existing `refund-policy` route and Inertia page identifier are preserved. No controller, migration, new query, subscription behavior, payment logic, or admin settings change.

## Implementation

- `resources/js/pages/public/PolicyNotice.tsx`: exact policy body, breadcrumb, section index, accessible in-page anchors, contact links and Terms and Conditions link. Uses `PublicLayout siteLayout homePrototype guideLayout`, the same shared header/footer infrastructure as the homepage. Member navigation remains under the existing member shell.
- `resources/css/pm-terms.css`: reuse the legal-page layout, guide tokens, type scale, banner and reading rail. Refund-specific rules adjust spacing, contents panel radius, sticky-header anchor offset and narrow-screen/member fit. Existing Terms selectors are unchanged apart from the introductory comment.
- `tests/Regression/refundPolicyPrototype.test.mjs`: route, copy, links, accessibility, shared layout and central CSS token regression checks.

The footer remains the approved existing homepage footer, including the prior removal of the mockup/sample-content attribution. The current administrator-controlled offer and footer settings remain intact.

## Verification

- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 256 passed, 0 failed (Node 22.16.0).
- TypeScript transpileModule syntax diagnostics for the modified page: none. This is not a full type check.
- `php -l routes/web.php`: passed.
- Production build and full TypeScript check not executed: npm packages were not present and offline npm installation failed with ENOTCACHED; external registry DNS unavailable. The existing Vite Plus lockfile requires Node 22.18+ or another supported version.
- Chromium navigation was blocked by environment policy; visual browser parity and actual Laravel HTTP/DB integration remain unverified. Responsive rules are implemented, not certified on real devices.

## Local deployment

This source archive preserves the original prebuilt `public/build` assets because a full Vite build was not available. Rebuild before previewing or deploying to avoid serving the original placeholder. Use your existing local `.env` and database, and Node 22.18+.

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

If the existing project already has its dependencies installed, `npm ci` may be skipped. Use the existing development server or normal deployment workflow. No migration or seeder is required. Verify `/refund-policy` at desktop, tablet and mobile widths, all four contents links, both contact links and the Terms link. No production changes were performed.
