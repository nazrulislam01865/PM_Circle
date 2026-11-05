# PM Circle: crop dialog visibility and profile hero alignment

## Source baseline
Latest uploaded `Archive 7.zip` and screenshots from 5 November 2026.

## Corrected issues

1. **Invisible crop action**: `ProfileImageCropDialog` uses a Radix portal outside the `.pm-profile-page` subtree. Its primary button previously depended on the `--pm-dash-blue` variable scoped inside the dashboard, leaving the normal background unresolved while white button text remained. The portal now has explicit shared-system button styles and a fixed-height, scrollable content area with a non-scrolling footer. Both Cancel and Crop and upload are visible before hover, including on narrow screens.
2. **Experience checkbox alignment**: `Currently work here` now aligns vertically with the End date input rather than its label, without changing field order, validation, or save payload.
3. **Overview hero**: Adjusted cover height, photo overlap and size, name, subtitle, map pin, and status pill to reflect the supplied reference. Removed private phone from the visual hero (still editable in the existing profile form). For older imports that stored a three-part address in `headline` while leaving city and country empty, a display-only fallback shows that address in the location row and uses the existing professional role as headline. No stored field is changed.

## Affected code

- `resources/css/pm-profile-ux.css` — scoped visual refinements; explicit portal-safe colors for crop buttons.
- `resources/js/components/profile/ProfileEntryEditor.tsx` — adds a semantic class only for `Currently work here` checkbox placement.
- `resources/js/pages/settings/profile.tsx` — prototype hero structure and presentation fallback for legacy address-like headlines.

No database migrations, controller queries, extra dependencies, changes to upload endpoints, or unrelated features.

## Verification executed

- `node` TypeScript transpilation syntax checks: both changed TSX files passed.
- `tinycss2` parsed the edited stylesheet without syntax errors.
- Static Chromium layout at `1366x768` and `390x844`: the crop action was visible before hover with computed `rgb(10, 102, 194)` background, and its bounds were inside the viewport; static desktop and mobile hero previews were inspected.
- Browser test runs against the actual Laravel/Inertia application, `npm run types:check`, `npm run build`, and PHPUnit **were not executed** in this environment because installed project dependencies (`node_modules` and `vendor`) were unavailable in the archive.

## Deploy / local verification

1. Back up any locally modified files before overlaying the updated-files ZIP.
2. Copy the three changed files into their original paths. If using the full-source archive, preserve your local `.env`, user uploads, and database.
3. Run `npm ci` if JS dependencies are missing, then `npm run types:check` and `npm run build`; do not rely on the old compiled assets included in the snapshot.
4. Run `php artisan optimize:clear` and `php artisan test --filter=ProfileEntryWorkflowTest`.
5. Visually verify: open Edit profile, upload a portrait, confirm blue Crop and upload button exists **before hovering**, crop and upload, inspect Overview portrait, verify hero on desktop and mobile, and verify the End date / Currently work here alignment.

Known constraint: the address fallback is presentational only; members should enter country/city in structured fields rather than storing them in the professional headline.
