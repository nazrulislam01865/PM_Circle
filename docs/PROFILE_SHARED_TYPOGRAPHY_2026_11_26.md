# Shared profile workspace typography (2026-11-26)

Source: Archive 7(3).zip and the supplied 2026-11-26 design guide (identical to the in-project guide).

## Root cause
Overview alone applied a `font` shorthand to `.pm-profile-tab-item` using the 14px UI control token and 650 weight. Other tabs used the legacy 15px-named alias, which actually resolves to 16px body text, at 600 weight and an inherited/normal line height. The page header also had separate editor and member-shell declarations. Both were using the Inter family token; the issue was inconsistent semantic type roles, not separate font libraries.

## Changes
- The shared profile navigation uses the approved UI control role (`--text-ui`, `--pm-guide-weight-control`, `--line-ui`, `--font-ui`) and a shared minimum touch height. Public member profile navigation, which reuses this class, receives the same typography.
- The shared title and subtitle use the guide H1 and lead roles; no editor-only or overview-only header overrides remain. Header actions share the same control typography. The title flex item can shrink or wrap; empty action groups no longer take space.
- No changes to profile data, feature availability, routing, authorization, or the CV document typography. Resume & imports remains hidden by the existing configuration switch.

## Verification
- 23/23 targeted Node regression checks passed with `node --experimental-strip-types --test`.
- Full Node regression suite: 463/465 passed. Both failing tests reproduced on the original archive (`pmpWorkbookAndDashboard`, `profileEditorPrototype`).
- Actual source CSS import cascade checked in standalone Chromium fixtures at 1440, 1024, 768 and 390 CSS pixels; identical computed font-family, size, weight, line-height and letter-spacing for H1, subtitle, inactive and active navigation across all five variants, including optional imports. This is not an authenticated React/Laravel browser test; external font delivery was not verified.
- Modified CSS parsed with PostCSS; modified TSX transpiled with TypeScript. Full type checking and production build were not run (dependencies not installed).

## Deployment
Preserve existing `.env` and private storage. Rebuild (`npm ci` if dependencies are absent, then `npm run build`), clear Laravel caches and regenerate them as appropriate. No migration or seed is required. The source archive omits compiled build assets, cached Laravel files, and runtime session/debug data.
