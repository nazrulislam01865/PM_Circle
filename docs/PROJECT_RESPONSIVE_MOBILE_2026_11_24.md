# Compact device responsive update (24 November 2026)

Baseline: user-supplied Archive 3(3).zip. Existing PM Circle design guide and centralized typography/theme tokens remain authoritative.

## Implementation
- Public homepage header: compact menu at <=1050px, login in menu at <=650px, accessible icon-only search, touch-sized controls, normal-flow offer banner on compact devices so a wrapped promotion cannot obscure sticky header. Dismissing the member offer removes its offset; desktop header remains in place. Duplicate discount suffix is normalized in both offer and reward card.
- Homepage: compact section headings and CTA stacking, responsive reward banner, single card per horizontal carousel at <=650px, single-column resource cards and AI cards, full-width hero image at <=700px, direct slide selection on narrow phones.
- Community posts: at <=767px only reaction and comment actions remain in the ordinary footer; reaction count is adjacent and opens the existing real roster (zero shown as text). Share, Save and Read discussion are available in the top-right overflow menu, with original member management actions retained. Desktop order and existing authorization/join prompts are retained. The save and share handlers share state between menu and footer. Sample homepage posts retain their sample navigation/join behavior and do not invent a roster. Daily Challenge scenario cards are distinct from community post cards and retain their existing scenario actions.
- Reusable mobile disclosure for public/member course catalogs and Scenario Library at <=700px, keeping selections, reset and active filter count. Scenario tabs fit without clipping; date and summary stack on narrow screens. Public course topic chips scroll horizontally in their own rail.
- No backend code, query, migration, API, dependency, or design-token changes. The existing roster endpoint is requested only when opened; mutations retain existing handlers and permissions.

## Verification
- 299/299 Node regression tests passed (296 existing, 3 added; one existing hover assertion updated to check the intentional mouse-only pointer leave).
- 562 TS/TSX source files passed TypeScript transpile syntax diagnostics; 87 CSS files parsed with PostCSS. This is not a complete type-check.
- 65 isolated Chromium CSS fixtures: public header, feed post, homepage post and carousel, scenario filters/tabs, public and member course filters across 320, 360, 390, 430, 500, 540, 650, 700, 767, 768, 900, 1024, 1440 CSS px. Checks cover header overlap/sticky offset, viewport overflow, mobile action visibility, large reaction/comment counts on same row, picker bounds, carousel card width, sidebar columns, filter visibility and scenario tabs. These are representative markup fixtures using source CSS, not running React/Laravel interactions or exhaustive live-page coverage.
- Production build attempted: `npm run build` fails because the `vp` executable is not installed in the supplied environment. Full TS type-check and Laravel browser/feature tests not executed (dependencies unavailable).

## Apply
Use the changed-files archive over the same baseline. Run `npm run build`, `php artisan optimize:clear`, hard refresh. Existing compiled frontend assets retained in full archive; rebuild required. Test real authenticated and guest post interactions, mobile menus, and all remaining live routes locally before release. No database changes.
