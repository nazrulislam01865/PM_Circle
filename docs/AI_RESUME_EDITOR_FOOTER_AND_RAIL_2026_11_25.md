# Resume assistant editor footer and sticky preview correction

Source: the previous full export/sticky-rail project. This is a presentation-only follow-up; no database, route, controller, extraction, scoring or export changes.

- Save draft and Submit profile are restored to the bottom of the left editor card, aligned to the right of the existing note. Existing handlers, disabled states, validation, feedback and confirmation remain intact.
- The right column contains quality, the full-preview button and the live A4 preview only. The rail itself is the single keyboard-focusable scrolling region; grid rows retain intrinsic heights so the preview card is not compressed and all pages are reachable.
- Sticky positioning uses the shared header/offer offset plus the measured height of the existing profile tab bar. A passive scroll listener, resize listener and ResizeObserver update only CSS variables (at most once per animation frame); the height is bounded by the editor grid bottom near the footer. Observers/listeners are cleaned up when leaving the editor. Narrow or short viewports retain ordinary document scrolling.
- Existing central typography, spacing, colors and controls remain unchanged.

Verification: 394/395 source regression checks passed (existing unrelated PMP dashboard counter assertion fails); targeted resume regression checks passed. TSX transpilation reported zero diagnostics. Chromium layout fixtures using rendered component markup and the actual rail sizing function checked five viewport sizes, mid/end scroll positions, reaching the last of three fixture pages and button placement. These are offline layout fixtures rather than authenticated Laravel browser tests. Full production build and runtime integration are not verified here.
