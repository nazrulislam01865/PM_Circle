# Versioned Terms and Privacy administration

Base: Archive 3.zip. Existing public routes `/terms` and `/privacy`, all 22 original draft sections, paragraph/list formatting, internal links, public/member layout and centralized legal styles are retained. The Refund Policy is outside this change.

## Administration
- Admin sidebar: Terms and Conditions (`/admin/legal/terms`) and Privacy Policy (`/admin/legal/privacy`).
- Each page has its own page title, description, search description, contents heading and ordered sections. Add, edit, reorder, or remove sections in the draft; existing section IDs remain stable on reorder/rename.
- Save draft before publishing. Preview the draft in the editor. Confirm approval explicitly and publish the saved revision. Publication changes only that document.
- Blank lines separate paragraphs, `- ` begins a bullet, `**text**` is bold, `[label](/contact)` is a local link and HTTPS links are supported. Arbitrary HTML is not interpreted; unsafe links render as text.
- The latest 30 publications are listed in the editor. Every version remains available at `/{document}?version=legal-{id}`. Restore older wording by copying it into a new draft and publishing a new version; never edit/delete a published snapshot.
- Optimistic revisions and row locks reject stale concurrent edits and duplicate publications. Existing authentication/admin/verification middleware and throttling protect writes.

## Migration and signup
`2026_11_26_000007_create_versioned_legal_pages.php` creates `legal_pages` (draft and current publication pointer) and `legal_page_versions` (immutable via application routes; publisher and timestamp). Initial drafts are imported from `resources/legal/defaults.json`. Before initial publication, visitors see the original draft clearly marked as such, never unpublished editor changes. No existing user acceptance fields are rewritten. The old environment versions are retained for local/test registration when no document has been published. Historic text for old environment-only acceptance versions cannot be reconstructed with this archive.

**Important: production registration is unavailable until both documents have been explicitly published through admin.** `PMC_LEGAL_DOCUMENTS_PUBLISHED` is no longer the authoritative gate; the stored current versions are. Existing accounts and login are unaffected. Deploy in a controlled window, confirm approved legal wording before publishing both, then test signup. Do not publish the supplied prototype as approved legal text without review. The staged signup links to immutable versions, submits both IDs, and verifies them under the same document row locks as publication. A newer publication rejects an outdated acceptance; the user must review and accept again. Existing members are not forced to reaccept in this update. No notifications are sent automatically.

## Verification
- 516/517 source regression checks; the single PMP dashboard failure is unchanged from the original archive (all nine files used by the failing test are byte-identical).
- 14 existing legal/banner regression checks, 4 new legal regression checks; all passed.
- 11 PHP syntax checks, 8 TS/TSX transpilation syntax checks.
- Five Laravel integration tests added in `tests/Feature/Admin/LegalPageManagementTest.php` but not executed: Composer/vendor dependencies unavailable. Node 22.16 is below required Node 22.18 and offline npm installation failed (`yuku-parser@0.19.0` uncached). No full build, type check, database execution or browser verification claimed.
- Public document adds one database lookup; signup retrieves current versions once on guest form load and locks the two rows during account creation. No per-section queries or new package dependencies.

## Deploy
Preserve `.env`, database, and private storage. Back up the database. Run with Node 22.18+ (22.x supported), PHP 8.4 and Composer installed:
```
composer install
npm ci
php artisan optimize:clear
php artisan migrate
npm run types:check
npm run build
php artisan optimize
```
Run `php artisan test --filter=LegalPageManagementTest` in the isolated test environment before release. Publish both approved documents in admin and verify public navigation, version links, draft isolation, and new member acceptance before reopening registration. No seeding needed. Do not roll back the new tables after publishing without preserving version history and acceptance references.
