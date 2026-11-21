# Public homepage menu text alignment

## Change

The homepage header previously shared its 15px body text variable with desktop navigation links, whereas the prototype menu is approximately 14px. Added `--pm-v2-font-header-nav: var(--text-ui)` (14px) and a compact navigation token in the central design tokens file. The homepage menu, menu dropdown, search toggle, log-in text, and header CTA now use the new token. The pre-existing compact navigation font size remains 12px.

## Files

- `resources/css/pm-design-tokens.css`: central desktop/compact header font tokens.
- `resources/css/pm-home-v2-layout.css`: homepage header text styles only.
- `resources/css/pm-home-v2-responsive.css`: uses central compact token.
- `tests/Regression/publicHomeHeaderFontParity.test.mjs`: static regression check.

There are no React, route, controller, database, permission, or subscription changes. Other homepage sections and shared headers are unchanged. A production browser comparison at matching zoom and viewport is still required for pixel-level verification.
