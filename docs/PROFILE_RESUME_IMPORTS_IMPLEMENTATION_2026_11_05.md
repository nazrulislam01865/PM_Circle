# PM Circle — My profile / Resume & imports implementation

## Scope

Updated only the Resume & imports tab, its shared profile data contract, private resume upload/extraction/apply workflow, and the minimal profile fields needed to show an approved import in Overview and Edit profile. The sidebar, navigation, and unrelated member pages are unchanged.

## Data flow

1. An authenticated member uploads one PDF or DOCX, max 5 MB, to Laravel's **private local disk**. File type and size are validated server-side. A `profile_resumes` record and a `profile_import_sessions` record (`processing`) are saved in one database transaction.
2. `AnalyzeProfileResume` is dispatched after database commit. It extracts real text with Poppler `pdftotext` (PDF, first 10 pages) or `ZipArchive` / `unzip` (DOCX) and runs conservative local field extraction. **No fake resume extraction or fabricated qualification is returned.** Image-only PDFs are rejected with a readable warning; automatic OCR is not included.
3. The Resume & imports screen requests only `status` from an authorization-checked, single-row polling endpoint while processing. Once complete, it reloads the Inertia `profileData` once.
4. `ProfileImportPresenter` creates the comparison table from the existing eagerly loaded profile and the stored extraction. Each row allows keep/replace or keep/merge as appropriate. Phone and certification changes are unchecked by default.
5. `ApplyProfileImport` validates the session owner and `ready` state, uses a transaction and row lock, and applies **only selected fields**. It never deletes existing experience, education or certification records; duplicate entities are filtered by existing keys in bounded bulk queries. Certifications are always self-reported.
6. Redirect to Overview reads the updated persisted profile. Edit profile uses the same model data and also includes a private phone field.

## Files and design system

`resources/js/components/profile/ResumeImportsTab.tsx` is the standalone responsive tab component. `resources/css/pm-resume-imports.css` uses shared `--font`, `--type-*`, `--primary`, `--text`, `--muted`, `--divider`, `--field-height`, `--radius` and `--space-*` values. It is imported once in `resources/css/app.css`, after the existing profile styles. No global unrelated redesign was performed.

The prototype's top two upload cards, three-step review panel, comparison table, actions, document toolbar, privacy control, and import history are included. The PDF export opens a **printable profile view** with a Print / Save as PDF button; Word export downloads a Word-compatible `.doc` file. PDF binary generation and a `.docx` generator are not included, so these controls should not be described as downloading generated binary PDF/DOCX files automatically.

## Security and performance

- All resume/download/preview/import/status/apply routes require authentication and check ownership.
- LinkedIn export upload enforces Plus/Pro server-side; storing a LinkedIn URL is a normal profile link, not LinkedIn scraping/sync.
- No uploaded document is sent to an external AI API by this implementation. Text extraction is deterministic/local; uncertain values require manual review.
- Normal import data is loaded as one bounded latest file, at most six import sessions, and existing eager-loaded profile relations. The presenter has no database queries. Apply does at most one existing-key query and one insert per selected related entity table, not per candidate row.
- `profile_import_sessions.profile_resume_id` identifies the exact source; the secure delete action also cleans its extraction records.
- Extraction is queued; keep queue workers running. `QUEUE_CONNECTION=sync` works for local tests, but performs extraction during the web request and should not be used for production.
- Scanned PDF OCR, multilingual complex layout parsing, and semantic AI extraction are not included; the UI reports when text cannot be read rather than inventing data.

## Required migration

`2026_11_05_000003_link_profile_resume_imports_and_contact.php` adds `profiles.phone` and a nullable `profile_import_sessions.profile_resume_id` foreign key. Both are additive and do not delete existing rows. Review migration on staging before running in production. Existing old import sessions are not linked to a resume and remain in history if present.

## Deployment

```bash
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views
php artisan migrate --pretend
php artisan migrate --force
php artisan optimize:clear
npm ci
npm run types:check
npm run build
php artisan test --filter=ResumeImportFlowTest
php artisan queue:work --once  # local smoke test, or restart the existing production Horizon workers
```

Requirements: PHP 8.3+ with mbstring, the `pdftotext` executable (Poppler) for PDF, and either PHP ZipArchive or the `unzip` executable for DOCX. Node.js >=22.18 for the included Vite toolchain. Keep storage on a private disk and queue infrastructure configured (Redis/Horizon for production). Never run a destructive schema command as part of this patch.

## Verification in this build environment

- PHP syntax checks passed for changed backend files.
- New TSX component and the modified profile page passed TypeScript syntax/transpile parsing.
- Added CSS passed parsing checks.
- Direct deterministic extractor smoke test produced name, headline, skills, experience, education, and certifications from input text.
- Full Composer/PHPUnit tests were **not run** because `vendor/` was not provided. The available PHP CLI lacks mbstring, although the target Laravel environment must provide it.
- Full TypeScript type checking and Vite build were **not run** because the npm offline cache lacked a required package (`yuku-parser`) and the available Node.js was v22.16, below the package's required v22.18.
- Browser pixel comparison and live resume uploads/queue processing are **not verified** here.
