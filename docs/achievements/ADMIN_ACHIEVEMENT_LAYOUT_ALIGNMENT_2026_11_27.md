# Achievement administration: layout alignment

Scope: All badges, Create/Edit badge, Task & event rewards, Award records, Member preview. The base is the previously delivered `PM_Circle_Admin_Achievements_Updated.zip`.

- Removed the achievement-only workspace width cap and local page-title type override. All views inherit `AdminLayout`'s full-width content rail, gutters and heading typography. Heading actions remain right aligned.
- Reused the shared course-admin panel heading and existing PMDropdown, buttons, medal and dialog components. No global design token or shared shell changed.
- Member preview separates activity selection from the reward result grid; badges are direct, equal-height grid children with no redundant containing card. Activity context, count and empty states are visible. The same `BadgePreviewCard` renders the editor preview. The preview page uses the usual topbar link and a back-to-rewards action.
- Responsive filters, quick-create controls, editor columns and preview rail respond to actual available content width. The editor rail accounts for the sticky header. Task rows, search fields, table actions and award history table spacing align with the existing admin workspace.
- No changes to routes, controllers, database schema, permissions, verification, issuance, or payment. No new API calls or dependencies.

Verification: Node static regression suite 569/569, including two new layout regressions; TypeScript transpile checks for the three modified TSX files and CSS parsing passed. Chromium static markup/CSS fixtures confirmed full-width main rail, desktop horizontal preview cards, mobile stacking, editor column adaptation and no horizontal document overflow at 1600, 1024 and 390 CSS pixels. Fixtures are not a compiled application or functional browser integration test. Full TypeScript checking, Vite compilation, Laravel and authenticated browser checks remain pending because project dependencies are not installed in this environment.

Deploy: replace changed files, run `npm run types:check` and `npm run build` with installed locked dependencies, then `php artisan optimize:clear` and `php artisan optimize`. No new migration is needed for this layout-only update; the prior achievement module migrations must already be applied. Verify on staging before production.
