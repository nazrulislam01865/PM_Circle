# PM Circle public homepage render fix and editor simplification (2026-11-20)

## Scope

Based on the user-supplied `Archive 8(1).zip` project snapshot. Only the public homepage rendering bug and Homepage Control editing layout were changed.

## Root cause: blank public homepage

`resources/js/components/home/CareerHighlights.tsx` rendered `<FileText>` in the Opportunities & Resume area but did not import `FileText` from `lucide-react`. When that visible section rendered, the browser could throw `ReferenceError: FileText is not defined`, resulting in an empty page. The missing import is now present. No public-homepage SQL, route, content, auth, or footer logic was changed.

## Homepage editor layout

- `resources/js/pages/admin/Homepage.tsx`: uses `pm-admin-home-editor` to scope a simpler editor layout.
- `resources/css/pm-admin.css`: homepage fields, grouped CTA inputs, and repeatable card fields use a single readable column, limited to 54 rem for comfortable scanning. Existing PM Circle CSS tokens are reused and other admin forms retain their layout.
- `resources/js/components/admin/HomepageFields.tsx`: a destination field presents its existing editable path input first; optional suggested pages are available behind a `Choose a suggested page` disclosure instead of always rendering a second dropdown. The value and backend submission format are unchanged. Its other consumer (PMP admin) does not use the `route` field type.

## Verification

- 122/122 JS regression checks passed (`node --experimental-strip-types --test tests/Regression/*.test.mjs`, from project root).
- All three modified TSX files transpile with TypeScript without parse diagnostics.
- `pm-admin.css` has no tinycss2 CSS parser errors.
- No migration; no PHP code changes; no server query or API changes.
- Full `npm run types:check`, `npm run build` and Laravel feature tests **not executed** because this source snapshot does not include installed `node_modules` or Composer `vendor`. Run these locally before deploying.

## Local use

Apply changed files, then run:

```bash
npm ci
npm run types:check
npm run build
node --experimental-strip-types --test tests/Regression/homepagePublicRenderAndEditorLayout.test.mjs
php artisan optimize:clear
```

For a live deployment, ensure updated `public/build` assets are deployed after `npm run build` and refresh the page with a hard reload. Check browser console and Laravel logs if a blank page persists; no live server was inspected in this task.
