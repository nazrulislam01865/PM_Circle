# PM Circle homepage: layout, design system and interactions

## Scope and architecture

This patch is based on `Archive 3(5).zip` and is scoped to the public homepage and its supporting reaction endpoints. Existing learning, billing, memberships, and dashboard pages are not redesigned.

- **Desktop** (above 920px): `pm-home-showcases` uses a two-column grid. Scenario and community cards share a stacked left column; `New to the circle` and `Build your next skill` remain stacked in the right sidebar. Below 920px the layout uses a single main column and responsive sidebar. This reverts the unintended full-width, vertical-only section introduced in the prior patch.
- **Central design system**: shared typography scale, canonical Arial-based font family, action heights, palette, semantic reaction colors, and radii live in `resources/css/pm-circle.css`; the homepage consumes variables in `resources/css/pm-home.css`. The homepage style file contains no literal hex colors or hardcoded `font-size: Npx` declarations. Existing global styles are not rewritten.
- **Reaction picker**: one reusable React component shows seven reactions (Like, Love, Care, Haha, Wow, Sad, Angry) on desktop hover/focus and tap on touch. Select to persist; choose the active reaction again to remove. Controls use keyboard focus and accessible names.
- **Guest journey**: attempted react, comment, reply, discussion participation, or share opens an accessible Radix dialog with Join and Login options. Signed-in members who have not completed onboarding receive a setup prompt. Guest read-only navigation is unchanged.
- **Existing member journey**: reactions update without a full homepage reload using JSON over the existing session+CSRF web middleware. Comment/reply navigation goes to existing discussion pages; share copies the URL using the clipboard API (requires a secure context).

## Persistence and security

- Post reactions reuse `post_reactions` and `ReactToPost` with the expanded seven-type validation. The existing unique (`post_id`, `user_id`) prevents duplicate selections.
- Scenario reactions reuse `scenario_reactions`. The controller serializes updates per member, replaces only reaction types (does not delete preexisting `save` entries), and keeps the existing unique constraint intact.
- The new `scenario_response_reactions` table records reactions to individual scenario responses with a database unique index (`scenario_response_id`, `user_id`). The foreign keys cascade when a response or user is deleted.
- All writes require Laravel's existing `auth`, `verified`, and `pm.onboarded` middleware, plus per-route throttling. Validation allows only the seven declared reaction types. Scenario publication status and response ownership are checked server-side. No payment or subscription behavior changes.
- Home queries use Eloquent `withCount` scalar subqueries for reaction totals and correlated single-value select subqueries for each signed-in viewer's reaction. Response and post authors are eager-loaded and the number of preview records is bounded. These queries do not execute inside React loops.

## Files changed

- `resources/css/pm-circle.css`: centralized typography and homepage visual tokens.
- `resources/css/pm-home.css`: desktop sidebar grid, scoped font scale, component states, responsive reaction picker, guest dialog styling.
- `resources/js/components/home/HomeEngagement.tsx`: reusable reaction picker, join modal, share and comment controls.
- `resources/js/components/home/ScenarioPreview.tsx`, `HomePostPreview.tsx`, `HomeCommunitySection.tsx`: connect actions without duplicating business logic.
- `resources/js/pages/public/Home.tsx`: desktop two-column structure and one guest join modal.
- `app/Http/Controllers/PublicSite/HomeController.php`: bounded homepage aggregation and viewer reaction selection.
- `app/Http/Controllers/Community/PostInteractionController.php`: seven valid post reactions and small JSON results.
- `app/Http/Controllers/Scenario/ScenarioReactionController.php`: authenticated scenario and response actions.
- `app/Models/Scenario.php`, `ScenarioResponse.php`, `ScenarioReaction.php`, `ScenarioResponseReaction.php`: Eloquent relationships.
- `routes/web.php`: reaction write endpoints and throttles.
- `database/migrations/2026_11_05_000001_create_scenario_response_reactions.php`: new storage.
- `tests/Feature/PublicSite/HomeEngagementTest.php`: persistence, replacement, authorization, ownership and homepage props.

## Install and test

On a local copy with valid Composer dependencies and Node.js **22.18+**:

```bash
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views
chmod -R u+rwX bootstrap/cache storage
php artisan config:clear
php artisan migrate --pretend
php artisan migrate
npm ci
npm run types:check
npm run build
php artisan test --filter=HomeEngagementTest
php artisan test --filter=HomePageContentTest
```

Do not run `db:seed` for this patch; it neither changes nor requires demo records. In production, back up the PostgreSQL database before migrations, review the `--pretend` output, build frontend assets and deploy according to the existing release procedure.

## Verification note

All changed PHP files and added feature test pass `php -l`. Modified TypeScript/TSX files pass standalone TypeScript transpilation diagnostics. Both affected CSS files parse successfully. Full Laravel tests and complete Vite/TypeScript builds could not execute in this container: Composer vendor dependencies were absent, the npm offline cache was incomplete, and available Node.js was v22.16.0. Browser-based pixel comparison and performance measurement against a live PostgreSQL dataset still need running-environment verification. Do not treat the above as a production deployment confirmation.
