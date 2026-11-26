# Dynamic footer — single admin control

## Administration

Open Admin → Navigation control → Footer control (`/admin/footer`). Header menu remains a separate header-only control. The previous `/admin/navigation?category=footer_menu` and `/admin/exam-simulator/pmp?section=footer` links redirect to the same footer editor. The old PMP footer toggle is no longer used; all ordinary public pages share one footer configuration. Existing standalone active exam exclusions remain unchanged.

- Brand: name, byline, uploaded logo, logo destination, description and visibility.
- Public link columns: add/remove/reorder up to eight columns; edit heading, visibility, and add/remove/reorder up to 16 links per column.
- Social links: add/remove/reorder up to 16 items, edit accessible label and HTTPS URL, choose a built-in icon or upload a custom PNG/JPG/WebP image. Blank URLs are hidden. Existing image uploader and validation are reused (2 MB limit). Removing an uploaded image selects the default icon; stored media is not destructively deleted.
- Public bottom area: trademark/legal label and text, visibility, copyright and optional links.
- Compact authenticated footer: its own link list and visibility plus shared copyright/notice text, editable notice trigger label. Both layouts have editor previews.
- Existing design tokens, card and controls are reused; columns wrap responsively. Footer content has no per-link queries.

## Storage and compatibility

The existing `home_page_contents` record with key `pmp_public` stores the complete footer under `footer_v2`. Existing legacy fields and master-data footer destination records remain preserved for recovery/suggestions, but their old editing screen is retired. Before the first save, the compatibility adapter maps the previously visible prototype text, links, social order, configured brand/images/social URLs and existing visibility switches. Older fields that the prior hard-coded footer ignored (including alternate copy and additional menu rows) are not silently published; review and re-add desired content through the new editor. Existing social destination defaults may be generic network URLs, not actual brand accounts. Replace them with the real profile URLs. The default Testimonials link now targets `/exam-simulator/pmp/details#learner-testimonials` where the section actually renders.

Saving replaces the ordered footer configuration, including deliberately empty lists, not the unrelated PMP content. Revision checks and transactional locking prevent stale writes; existing cache invalidation refreshes content. PMP page editing preserves the separate footer key. No migration, new package or seeder required for this update. Ensure the previous legal migration is applied if not already done.

## Security

Admin middleware, Form Request authorization, revision checks, existing throttling, bounded nested arrays, safe existing internal GET destinations, HTTPS external links, image URL allowlist and escaped React rendering. External links open with noopener/noreferrer. Actual legal document versions and acceptance records are not changed by footer edits.

## Verification

- Node source regression suite: 520/521; unchanged PMP dashboard `AI Tokens` assertion fails.
- React server-rendered component fixtures: 8/8, using actual React and stubs for Inertia links, icon shapes and dialog primitives. These checks do not verify live browser interactions or CSS rendering.
- Standalone PHP external/unsafe destination checks: 6/6; PHP syntax of 9 changed/new PHP files passed.
- Full TypeScript check reports the existing errors in `ProfileSectionJump.tsx:42` (TS2322) and `LegalPage.tsx:54` (TS2339), with no new footer diagnostics.
- Production build cannot run with uploaded macOS-only Vite native dependencies in Linux. Composer/vendor not included, so Laravel feature tests and database/runtime checks are not executed here. Updated integration tests: `SiteFooterManagementTest`.

## Deploy

Preserve `.env`, storage and database; install dependencies for the target OS using `npm ci`; run `npm run types:check` and resolve any existing errors, then `npm run build`, `php artisan optimize:clear`, `php artisan optimize`. Confirm public/member footer and save/preview functionality. Source archive excludes node_modules and runtime cache files.
