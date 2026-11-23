# PM Circle — Terms prototype layout alignment

Source: `Archive 12.zip` plus the immediately preceding Terms typography correction.

## Changes
- Align the Terms container to the same guide-aware rail used by the public Learn & Practice listing and homepage shell.
- Match the Terms prototype's 272px desktop contents sidebar, 60px inter-column gap, and 760px maximum legal reading column. These measurements are represented by centralized CSS variables.
- Restore the prototype's 16px sidebar links, 24px legal section headings, 16px body copy, and consistent heading/banner spacing.
- Adjust tablet/mobile grid breakpoints to avoid overflow.
- Keep the original `Terms.tsx` content and public layout, homepage header/footer, and all backend code untouched.

## Verification performed
- 5 targeted Terms regression checks passed.
- 202/202 runnable JavaScript regression checks passed when the unrelated Activity Log test referencing a missing style-guide HTML was excluded.
- PostCSS parsed both modified stylesheets; PHP route syntax passed.
- Chromium screenshot rendering stalled in the available execution environment. Production Vite build and pixel-perfect browser comparison have not been verified.

## Local installation
1. Overlay the patch at the project root, retaining relative paths.
2. Use Node 22.18+ and run `npm ci`, `npm run types:check`, `npm run build`.
3. Run `php artisan optimize:clear`, then hard-refresh `/terms`.

No migrations, additional queries, route/controller changes, or legal-content changes.
