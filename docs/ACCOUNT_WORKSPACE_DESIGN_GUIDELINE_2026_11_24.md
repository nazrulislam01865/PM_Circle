# Account workspace design guideline correction — 2026-11-24

Base: user-provided Archive(5).zip. Design authority: bundled PM_Circle_Design_Guidelines (1).html. The existing member navigation, footer, backend routes, support ticket persistence, plan access, membership switching and accounting services are unchanged.

## Findings and changes

- Account page text already referred to central tokens, but some semantic roles and component styles were inconsistent. Use the approved H1 static-font weight/tracking, H2 section role, H3 card role, H4 subheading role, 17px lead, 16px body, 14px metadata and controls (at 16px root). The H1 and H2 remain responsive.
- Help Centre uses FormField, visible search label, search icon, clear action, polite result count, uniform 44px guide actions with aligned arrows, H3 topic titles, 16px card padding/gaps, and primary/outline support links. Existing 18 guide articles and search catalog are unchanged. Guide article uses quick-answer tinted panel, numbered steps, related guide rows and a reading-width token. Search query is retained when returning from a guide.
- Account grid uses available workspace width (not full viewport) to select three columns above 850px, two between 541 and 850px, and one at 540px or below. This respects the member sidebar and browser zoom. Cards use central radius; featured panels use the 18px feature radius. Mobile support actions stack.
- Plan & usage uses a reusable native ProgressBar with explicit track and value styling in the canonical pm-ui-guideline.css (including Firefox and Chromium/WebKit). No native green/gray progress styling. Actual allocation, consumption, credits and reset values remain unchanged. Membership panel aligns icon, label and action; numeric table data right aligned, captions and column scope, access labels use semantic status colors. Narrow tables scroll in their own region.
- Support forms use shared field controls, validation relationships and upload progress. Native file picker button uses shared control tokens. Support tickets use consistent links, compact headings, metadata and status badges. Admin reply action uses the existing primary button. Resume Assistant inherits the same reading rail, field and card styles.
- Public guest help and contact page, other member routes, and admin shell are unchanged. FormField adds IDs for existing hints/errors without changing its public API.

## Verification

- All 327 Node static/data regression tests passed (324 existing + 3 new).
- 587 TypeScript/TSX sources transpiled without syntax diagnostics; 90 CSS files parsed with PostCSS. This is not a full TypeScript typecheck.
- 56 isolated Chromium layout checks: actual page JSX transpiled to static HTML with mocked hooks, icons, dropdowns and shell; eight page states at widths 320, 390, 540, 768, 1024, 1440 and 1680px. Checked page overflow, card padding, typography roles, control heights, responsive column count, progress styling, search icon padding, and error borders. These are not live React interactions or authenticated backend tests.
- Production build attempted: `npm run build` failed because `vp` is not installed in the extracted project. No Composer/Node dependencies installed. Live runtime and full production build still required locally.

## Apply

Extract the changes into the latest project, run `npm run build`, `php artisan optimize:clear`, and hard-refresh. No migration or seed is required for this styling update. The previous support-table migration remains required if the earlier member-workspace update has not been migrated. The archive retains previous built assets and must be rebuilt. No additional database queries or dependencies.
