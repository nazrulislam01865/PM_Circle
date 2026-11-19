# PM Circle — AI CV extraction backend (prepared, disabled by default)

## Scope

Uses the existing `/settings/profile/resume` upload, `AnalyzeProfileResume` background job, `profile_import_sessions` review/apply flow, and the existing Edit Profile schema. There is **no automatic overwrite**: extracted suggestions are visible on **My Profile → Resume & imports** and require explicit member approval. No new database schema, routes or frontend page is introduced. Existing post moderation, exam scoring, AI chat, and payment logic are unchanged.

## Activation when the owner approves a model and key

In the server-only `.env` (never `VITE_` and never in React):

```dotenv
PM_AI_RESUME_EXTRACT_ENABLED=true
OPENAI_RESUME_EXTRACT_API_KEY=your_restricted_responses_api_key
PM_AI_RESUME_EXTRACT_MODEL=your_approved_vision_capable_model
PM_AI_RESUME_EXTRACT_QUEUE=ai-interactive
PM_AI_RESUME_EXTRACT_DAILY_LIMIT=3
PM_AI_RESUME_EXTRACT_TIMEOUT_SECONDS=45
PM_AI_RESUME_EXTRACT_MAX_OUTPUT_TOKENS=6000
```

The dedicated restricted key needs **Responses API: Write**. Files API permission is not required: files are provided as inline base64 only when local extraction cannot read their text. Choose a model supporting Structured Outputs and PDF image inputs for scanned CVs. With `PM_AI_RESUME_EXTRACT_ENABLED=false` (default), the existing local text extractor remains operational and no external CV request is made. If enabled but key/model is missing, the import fails safely instead of silently claiming AI extraction.

Restart config cache and queues after configuration changes: `php artisan optimize:clear` and `php artisan queue:restart` (or your managed equivalent). Ensure that the Redis/Horizon worker handles the configured queue. Jobs have an 80-second timeout; keep queue `retry_after` **greater than 80 seconds** and worker supervisor timeouts appropriately configured. A cache-backed per-member limit (three CV AI requests/day by default) controls usage without a database query. A provider timeout is not automatically retried to prevent accidental duplicate billed calls. The member can retry from the import screen.

## Private-document processing

1. Member chooses a PDF or DOCX (5 MB maximum). The external AI option requires explicit consent. File stays on the private `local` disk.
2. If AI is disabled, local `pdftotext` / DOCX processing is used and suggestions are validated.
3. If AI is enabled, the service prefers locally extracted CV text (cheaper and less data sent). If extraction cannot read it, the private file is supplied directly to Responses API as an inline file input (scanned PDF supported by a vision-capable model). The API request uses `store: false`.
4. The provider returns strict JSON with only allowlisted editor fields. `ResumeImportShape` validates field types, date months, URLs, lengths, required identifiers, duplicate records, and enum values. Unknown data is discarded; missing facts are not invented. No raw CV or provider response body is logged.
5. The private review table shows differences. The owner chooses which updates to apply. All writes run in one transaction: relational experience/projects/education/certifications are bulk inserted without duplicating existing records; their extra attributes and the other profile-editor sections are stored in existing `profiles.editor_details` JSON. Profile, languages, and link fields merge safely. Credentials remain unverified and career availability/relocation are never inferred.
6. Resume removal deletes the private stored file and its import sessions by the existing owner-scoped route. A cancelled or replaced import cannot publish a delayed queued result.

### Supported target sections

Basic name, headline, role, location and industry; private contact phone; About and Skills; current organisation/tools/methods; Experience, Selected projects, Education, Certifications & licences, Courses & professional development, Awards & honours, Publications & speaking, Volunteering, Languages, Portfolio & links, and explicit Career preferences.

AI extraction does not modify account email, verified credentials, photos, subscription or employer visibility, privacy permissions, or active job-search availability.

## Validation & rollout checklist

```bash
php -d zend.assertions=1 -d assert.exception=1 tests/Regression/CvImportShapeStaticCheck.php
php artisan test --filter=CvProfileImportTest
php artisan test --filter=ProfileEditorPrototypeTest
npm run types:check
npm run build
php artisan queue:work redis --queue=ai-interactive --once
```

Test with a selectable-text PDF, a scanned PDF, and DOCX containing experience, projects, a certification with/without issuing organization, and missing dates. Confirm the owner review screen; apply selected suggestions; then open Edit Profile to verify the fields are **editable and remain saved after a subsequent profile save**. Verify another user cannot read/apply the import. Validate real token cost in a staging environment and approve the model, pricing, and budget before enabling paid production usage.

Token usage (model, input and output tokens) is recorded in `profile_import_sessions.extracted_data.ai_usage` after a successful API response. **It is not charged to the current AI credit wallet and does not enforce global AI expenditure limits**. Do not turn on paid AI extraction for general production members until an approved billing/budget policy is implemented or operational limits are set externally.

No production migration, database reset, or third-party PHP/JS package is required by this patch.
