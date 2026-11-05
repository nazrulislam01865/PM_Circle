# PM Circle — Profile editor interaction and persistence fix

The edit-profile navigation now uses real section anchors and opens the corresponding editor before scrolling. The Experience, Projects, Education, Certifications, Career preferences, and Links & languages panels have accessible expand/collapse controls. The editor uses the existing centralized PM Circle form/button CSS classes without changing the dashboard shell.

## Persistence
- Basic details, skills, career preferences, LinkedIn URL, and languages use the existing authenticated PATCH profile endpoint. PATCH validation supports partial updates.
- Experience uses the existing save/delete endpoints; Projects, Education, and Certifications have additional authenticated, owner-scoped save/delete routes backed by their existing tables.
- The certifications' verified flag is never accepted from the browser. Member-edited certifications are self-reported.
- Existing avatar uploading is retained; photo removal now deletes the authenticated member's own avatar.
- Profile lists and badges display actual saved records instead of hardcoded example entries or counts.
- The profile editor's newly added LinkedIn URL, languages, and certification expiry fields use a non-destructive migration.

## Local verification

```bash
php artisan migrate:status
php artisan migrate --pretend
php artisan migrate
php artisan test --filter=ProfileEntryWorkflowTest
php artisan test --filter=ProfileUpdateTest
npm ci
npm run types:check
npm run build
php artisan serve
```

Create a backup before running new migrations against any valuable database. Never use `migrate:fresh` for this update. Keep your current `.env`, secrets, and uploaded storage files.

## Scope and limitations
This change focuses on the Edit Profile sections and real persisted fields. Resume text extraction, LinkedIn synchronization, profile-visit analytics, and portfolio document generation remain separate prototype functionality. No claim is made that these integrations have been implemented or tested here.
