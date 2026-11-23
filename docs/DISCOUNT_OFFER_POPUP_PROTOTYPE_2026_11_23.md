# Public discount offer popup — 2026-11-23

## Scope and design reference

Source: the supplied `Archive(2).zip`, discount popup screenshot, and `PM_Circle_Design_Guidelines (1)(7).html`.

- The existing `PublicLayout` remains the shared page header, content, and footer owner.
- A single `RewardOfferProvider` is mounted when the existing cached `homeOfferLabel` is available. The header **View offer**, homepage **See how it works**, and simulator catalog **See how it works** open that dialog.
- The reusable dialog has the reference gift/title, four steps, guest registration and login options, authenticated profile navigation, and a close button. Radix Dialog provides focus management, Escape and backdrop dismissal, and scroll locking.
- Styling is scoped in `resources/css/pm-reward-offer-dialog.css`; typography, color, sizing and radius are drawn from `pm-design-tokens.css` and the supplied design guide. The screenshot and design guide provide the copy and visual hierarchy; no other public component is restyled.
- The discount amount remains from server-provided promotion settings. No new database query, coupon issuance, eligibility check, authentication endpoint, or purchase logic was added. Actual coupon issuance/redemption is still server-side.

## Affected files

- `resources/js/components/rewards/RewardOfferDialog.tsx` — reusable context and dialog.
- `resources/js/layouts/pm/PublicLayout.tsx` — single provider for home-prototype pages with a promotion.
- `resources/js/components/home/v2/HomeHero.tsx` — promo-bar View offer opens modal.
- `resources/js/components/home/v2/HomeLearning.tsx` — homepage simulator offer opens modal.
- `resources/js/components/exam/SimulatorCatalog.tsx` — catalog offer opens modal.
- `resources/css/pm-reward-offer-dialog.css` — scoped accessible and responsive presentation.
- `resources/css/pm-design-tokens.css` — centralized dialog size tokens.
- `resources/css/app.css` — CSS import.
- `tests/Regression/rewardOfferDialogPrototype.test.mjs` — contract regression checks.
- `bootstrap/cache/.gitignore` — keep required Laravel cache directory in clean ZIP extraction.

## Verification performed

- 3/3 targeted modal contract tests passed.
- 205/205 runnable JavaScript regression checks passed with Node type stripping; `activityLogUiGuideline.test.mjs` was excluded because its unrelated root style guide file is absent from the supplied ZIP.
- Modified TSX files parsed/transpiled without syntax diagnostics using global TypeScript.
- The new CSS passed `tinycss2` syntax parsing and every referenced CSS variable is centrally defined.
- PHP route syntax passed. The old `ProfileRewardStaticCheck.php` reported a pre-existing requirement mismatch about member navigation colors in the unmodified `pm-profile-reward.css` (not changed by this patch).
- Full `npm run types:check` and `npm run build` were not run here because npm dependencies are not installed; Node 22.16 is below the project's tooling minimum. Chromium headless screenshot attempt timed out; no pixel-perfect screenshot claim is made.

## Local verification/deployment

With Node 22.18+ and existing app credentials:

```bash
mkdir -p bootstrap/cache storage/framework/{sessions,views,cache/data} storage/logs
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Verify the offer popup from `/`, `/exam-simulator/pmp`, and `/simulators`, both logged-out and logged-in, on desktop and mobile. Confirm close button, backdrop, Escape key, and registration/profile destinations. No migrations or queue restarts are needed for this patch.
