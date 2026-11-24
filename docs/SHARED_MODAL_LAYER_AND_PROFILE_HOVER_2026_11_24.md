# Shared modal layering and author hover

## Root cause
Shared Radix dialogs and sheets previously used z-50, below the authenticated sticky navigation and offer banner (up to 121). The composer had a separate higher layer, leaving crop, reaction, report and other standard dialogs affected. Author avatars also applied their keyboard focus ring on mouse hover.

## Implementation
- `pm-design-tokens.css`: shared modal layer 900 and floating layer 1000. Overlay and content share the modal plane so DOM portal order puts a later modal's backdrop above earlier content.
- `pm-modal-layer.css` imported globally: full viewport backdrop using the approved design token, shared dialog/sheet layer and default dialog viewport constraint. Radix select, dropdown and tooltip content uses the floating layer. Specialized exam, reward and administrator dialogs consume the same tokens. Native `showModal()` dialogs retain the browser top layer.
- Shared `Dialog`/`Sheet` primitives no longer use the conflicting z-50 utilities. Existing inline course-practice confirmation and interview catalog dialogs use the shared portal, preserving explicit close/cancel and submit handlers. Default close button can be disabled where a custom close is already present. Existing modal dropdowns use the common floating layer. Composer no longer owns separate z-index values.
- Shared post author identity: only the name changes color and gains underline on mouse hover. Avatars remain clickable, retain keyboard-only focus ring and do not show a hover outline. Anonymous profile notices and real profile routing remain unchanged.
- Profile photo camera button uses an accessible label instead of the native title tooltip, which could linger over the crop dialog.

## Verification
313 Node regression tests passed, including 2 new shared modal tests and updated existing assertions for the centralized design. 566 TypeScript/TSX files parsed without syntax errors, 89 CSS stylesheets parsed. 30 isolated Chromium fixture checks passed at 320x568, 390x844, 768x900, 1024x600 and 1680x900: shared dialog/sheet overlay hit testing, bounds, nested portal order, floating control layering, avatar hover and keyboard focus, author name hover. Fixtures use actual source CSS plus representative layout markup and utility styles; they are not live React/Radix integration tests. `npm run build` was attempted and failed because `vp` is not installed in this environment. Full runtime and production build checks are required locally.

## Apply
Replace changed files, run `npm run build`, `php artisan optimize:clear`, hard refresh. No migrations, backend code, dependency changes or database operations. Verify member profile photo crop, composer, reaction list, report and delete dialogs and nested dropdowns at desktop/mobile in the live application. Verify the migrated interview catalog and course confirmation dialogs before deployment.
