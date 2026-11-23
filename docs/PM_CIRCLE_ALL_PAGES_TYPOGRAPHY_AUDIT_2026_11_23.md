# PM Circle — project-wide typography guideline alignment (Archive 11)

## Source and scope

- Latest approved HTML file: `PM_Circle_Design_Guidelines (1)(20261123-174005).html` (also stored as `PM_Circle_Design_Guidelines (1).html` in the updated project for automated testing).
- Audited **77** React/Inertia page modules, **191** shared component modules and **83** CSS stylesheets, including public, logged-in, exam, learning, community, careers, authentication and admin interfaces.
- **3416** CSS typography declarations inspected (font-family: 89, font-size: 1687, line-height: 635, font: 374, font-weight: 631); none retain independent unapproved literal font-family/font-weight/line-height declarations. Numeric font-size `0` occurs in existing decorative styles only.
- All page modules are individually listed in `docs/PM_CIRCLE_ALL_PAGES_TYPOGRAPHY_AUDIT_2026_11_23.csv`.

## Changes

1. **Centralized font:** Inter is the shared site font in `--font-ui`; the HTML page source now requests the same 400/600/700 faces as the uploaded guideline. The site still loads fonts via Google Fonts; the fallback is system-ui.
2. **Body:** 16px, 1.6 line-height across all layouts; default homepage desktop/mobile body also uses this source.
3. **Headings:** H1 `clamp(2rem,5vw,3.1rem)` / 1.12 line-height; H2 `clamp(1.5rem,3vw,2rem)` / 1.2; H3 18px / 1.35; H4 16px / 1.4. Approved static-face H1 resolves to weight 700, equivalent to the guide's 750 request with only 400/600/700 face files.
4. **Support text:** Lead 17px; metadata, labels, buttons 14px. Legacy size tokens and Tailwind sizes now reference the latest semantic guideline roles.
5. **Mobile:** Removed the legacy 24px H1 override. Homepage mobile text uses the same 16px approved body baseline; header navigation uses the centralized 14px control size.
6. **Legacy CSS:** 36 last local line-height literals normalized to guideline line-height tokens. Metric numbers and nontext graphics still use explicit shared metric/icon tokens instead of growing to H1 sizes.
7. **Tests:** New `tests/Regression/allPageTypographyCompliance.test.mjs` checks every CSS module and TSX page/component. Updated older tests that were asserting the superseded early-November font sizes. No route, controller, database or business-logic changes.

## Approved exceptions / why not every number is identical

- Exam score and progress numerals, chart annotations and icon-only marks must use their centralized metric/compact tokens, not ordinary body headings. This preserves readability and proportions.
- The generated avatar initials in `resources/js/components/pm/Avatar.tsx` use a size-dependent font-size for very small and large avatars. This is a graphic, not ordinary page body content.
- The 2FA recovery-code display uses monospace intentionally for code legibility, not for UI prose.
- Existing footer navigation, sidebar, exam timer and visual components preserve their approved layout and wording; no business data or moderation logic has been modified.

## Verification limitations

- **Source-level** compliance was checked across the complete React page and CSS inventory and the existing regression suite was executed.
- **Pixel-perfect desktop/tablet/mobile checks are not complete**; authenticated Laravel pages and dynamic admin screens require a running application and browser. This report does not claim visual equality for every URL.
- The original `public/build` assets were left untouched. **Run `npm ci && npm run build` with Node >=22.18, then `php artisan optimize:clear` before visually evaluating the update.** The current packaging environment lacks installed Node and PHP dependencies.
- No database migrations or seeders are needed.
