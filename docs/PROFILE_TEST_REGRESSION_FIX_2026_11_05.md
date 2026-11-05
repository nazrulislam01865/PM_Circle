# PM Circle profile regression fixes — 2026-11-05

## Scope

This is a narrow update based on the local test results supplied by the project owner. It does not change the profile UI, resume-analysis pipeline, or database schema.

### Fixed

- `app/Models/User.php` — added an `id DESC` tie-breaker to the existing `created_at DESC` ordering for resume records. The latest uploaded resume is deterministic even when uploads share a timestamp. No additional query is introduced.
- `tests/Feature/Settings/ResumeImportFlowTest.php` — corrected guarded timestamp fixture setup using `forceFill`, and added a regression for multiple uploads with the same timestamp.
- `tests/Feature/Settings/ProfileUpdateTest.php` — replaced the obsolete hardcoded demo-import request with a real ready import and explicit user choices; added a test that the old request is rejected without altering profile data.
- `tests/Feature/Settings/ProfileEntryWorkflowTest.php` — creates the private certification through the owning user's relationship so the required `user_id` exists at INSERT time; the cross-user authorization assertions remain intact.

### Verification performed here

- `php -l`: passed for all four modified files.
- Full Laravel feature tests: **not executed** because the supplied source archive has no `vendor/autoload.php` (Composer dependencies absent in this runtime).
- Frontend: no frontend source was changed; the supplied local log reports both `npm run types:check` and `npm run build` passed.

### Local verification

```bash
php artisan test --filter=ResumeImportFlowTest
php artisan test --filter=ProfileUpdateTest
php artisan test --filter=ProfileEntryWorkflowTest
```

If these pass, run the complete project suite with `php artisan test`. No migrations or additional NPM packages are needed. The unresolved `pm-profile-city-cover.webp` Vite reference is an existing nonfatal build warning and is outside this patch.
