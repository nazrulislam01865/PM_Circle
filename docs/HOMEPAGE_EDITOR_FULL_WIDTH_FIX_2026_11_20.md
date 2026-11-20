# Homepage Control: full-width stacked fields (2026-11-20)

## Root cause

The previous layout set `.pm-admin-home-editor .pm-admin-form-content` to `width: min(100%, 54rem)`. On wide screens, that limits all homepage field groups and repeatable cards to approximately half of the available editor card, leaving a large unused strip on the right. The data and inputs were not truncated.

## Fix

- Set the homepage form-content container to `width: 100%; min-width: 0;`.
- Keep the existing single-column (`minmax(0, 1fr)`) fields for readability and consistent top-to-bottom flow.
- Remove the redundant mobile-only width override.
- Restrict the change to the `.pm-admin-home-editor` scope so unrelated admin pages are not affected.
- Update the focused regression test to enforce full-width behavior.

No backend logic, persisted data, API, database query or migration changes.

## Validation

Run `node --experimental-strip-types --test tests/Regression/homepagePublicRenderAndEditorLayout.test.mjs`, the JS regression suite, then `npm run types:check` and `npm run build` in the installed local application.
