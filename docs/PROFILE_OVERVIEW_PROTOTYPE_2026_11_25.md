# Own profile overview prototype alignment — 2026-11-25

Baseline: user-supplied `Archive(3).zip` and the two overview screenshots. The supplied design guideline is byte-identical to the one in the archive.

- Scope: signed-in My profile Overview. Existing `ProfileWorkspaceHeader`, `ProfileHeroPhoto`, `ProfileOverviewSections`, `ProfileCompletionReward`, member shell and routes remain in use.
- Cover: wide 5.3:1 ratio, responsive overlapping portrait, compact identity block. Default asset was derived from the supplied screenshot; the small water region hidden by the sample avatar was reconstructed from adjacent water. No sample person's photo or identity is included. Custom covers remain first in the background stack, with the new image as fallback. The existing public and edit-profile cover assets are unchanged.
- Avatar camera remains available on pointer hover, keyboard focus and touch; existing upload/crop handlers are unchanged. Existing open-to-opportunities badge, public-profile preview and AI Assistant tab are retained.
- Completeness: horizontal accessible progress bar and percentage use the existing backend score. Incomplete eligible members can open the Assistant; other members can edit their profile. Complete profiles retain the completed message. No entitlement or reward calculation changes.
- Reward: profile variant follows the screenshot, with the existing admin-configured discount and pending/ready/expired/redeemed states. Pending shows Locked and Available at 100%; redundant profile edit link is replaced by the existing completeness CTA and header edit action. The dashboard variant and coupon copy functionality are unchanged.
- Typography: existing centralized Inter, H1/H2/H3, body, metadata, control, statistic, colors, spacing, card and border tokens. The screenshot's different display font is not introduced. Lower overview cards also use the shared semantic type roles.
- No migrations, queries, API endpoints, packages or changes to other profile tabs.

## Verification

- Node regression suite: 398/399; the same Exam Simulator assertion fails in baseline (394/395). Four new tests pass.
- PHP ProfilePhoneAndHeaderStaticCheck: 7/7. ProfileRewardStaticCheck has the same pre-existing reward-navigation assertion failure as baseline; earlier reward checks pass.
- TypeScript transpilation of three changed TSX files and PostCSS parsing of two changed CSS files pass.
- Offline Chromium layout fixture at 1600, 1440, 1024, 768, 390 and 320px: no page overflow, proper portrait overlap, no name/portrait collision, 18px card heading, 32px statistic, 14px button and 16px paragraph. Long name tested at 320px. These are not an authenticated live application test.
- npm offline install fails because yuku-parser 0.19.0 is not cached; available Node 22.16.0 is below the Vite Plus requirement. Production build and full Laravel tests are not verified.

## Deploy

Apply patch at project root, retain .env and existing storage, install using supported Node 22.18+ (Node 22 series), then run `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear`. No database migration. Full ZIP excludes stale public/build, private runtime files, caches and dependencies.
