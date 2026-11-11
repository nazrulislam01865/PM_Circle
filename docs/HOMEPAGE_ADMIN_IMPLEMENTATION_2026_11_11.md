# PM Circle — Homepage administration

## Implemented scope

The public homepage keeps the existing Inertia/React components and their layout. The existing `home_page_contents` PostgreSQL JSONB record is the single source of editable homepage content; no duplicate CMS tables were added. Published scenarios, posts, and public member profiles continue to be read from their respective domain tables. Admins may choose a published scenario, up to two published public posts, and up to three public members, or leave those selections empty for automatic recent previews.

Admin routes live under `/admin`, separate from the public pages and member dashboard. They use `auth`, `verified`, `pm.admin` middleware; every modifying action additionally checks `is_admin` in its Form Request. No admin privileges are granted at signup or by a default seeder. `/admin` shows a small overview dashboard. `/admin/homepage` edits the seven existing homepage content areas with section visibility toggles, validated fields, list editing, reorder actions, and portrait uploads. Buttons use allowed internal destinations only. Image uploads are PNG/JPG/WebP up to 2 MB on the configured public Laravel disk. Local disks require `storage:link`.

The submitted document is validated with explicit allowed keys, lengths, icon choices and link destinations. Internal demo identifiers are not exposed by the editor and remain unchanged. Updates use a row-level transaction/lock and compare and increment the numeric `revision` to prevent silent concurrent edits. The last editor ID is recorded. Homepage display never exposes private posts/members or unpublished scenarios.

The homepage's legacy `HomePageContentSeeder` still supplies defaults and is safe to rerun without replacing administrator edits. Homepage section headings, buttons, orbital captions, empty states, repeatable cards and section visibility are editable. Shared global navigation and the site footer are intentionally outside this homepage-only feature. Sample opportunity cards are visibly examples; enabling them does not create verified jobs.

## Deploy (back up the database first)

1. Deploy the updated project; keep existing `.env` and storage private.
2. `php artisan migrate --force`
3. `php artisan db:seed --class=HomePageContentSeeder --force` (idempotent; fills newly introduced keys without replacing existing edits)
4. `php artisan storage:link` (if using the local public disk; only if not already linked)
5. `npm ci && npm run types:check && npm run build`
6. `php artisan optimize:clear`
7. `php artisan test --filter=HomepageAdministrationTest`
8. Sign in as an existing, verified user. In a trusted server terminal run `php artisan pm:admin user@example.com` and explicitly confirm the grant. Open `/admin`.

Revoke access with `php artisan pm:admin user@example.com --revoke` and confirm. Do not enter an administrator email address in application source or `.env`. Do not use an administrator role for normal member actions.

## Performance, privacy, verification

Homepage preview SQL remains bounded and uses eager loading. Hiding a live-preview area avoids its associated public query. Admin selections are restricted to eligible published/public records and up to 40 options of each type are displayed at a time. The editor saves a single JSON document atomically; it does not issue writes per keystroke. If an option is no longer published, it will no longer appear in the public preview.

Review layout at desktop/tablet/mobile; verify permissions for guest, regular member, and granted admin. Test validation on every repeater and image upload and two-tab conflicting saves. For an empty installation, seed the homepage before editing. Full browser integration tests are recommended after deployment, especially if S3 storage is used.

### Filament note

This specific archive has no Filament dependency or existing panel provider. To avoid introducing an unverified new package and redesigning unrelated screens, the first admin area uses the **already installed Laravel + Inertia + React** stack and the existing PM Circle tokens. If a Filament panel is subsequently installed and approved, these admin controls can be ported to Filament resources without changing the homepage content contract or security rules.
