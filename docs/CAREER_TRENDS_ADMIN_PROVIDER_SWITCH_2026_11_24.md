# Career Trends admin corrections — 2026-11-24

## Scope
- Removed the page's sidebar, topbar, shell/background, content rail and breadcrumb overrides. The existing shared AdminLayout and admin theme are authoritative. The page still retains its own two-column settings panels and centralized design tokens.
- Topics and Target levels use a reusable type-to-search/create tag control. Active options come from the two new Master Data groups (one scoped query). Existing saved values are preserved. Custom entries are saved with the Career Trends configuration, not automatically added to global Master Data. Enter or Add creates a custom tag; select a matching master-data entry to store its stable value. Each field accepts up to 500 distinct values of up to 160 characters.
- Manage connection selects OpenAI or the optional Google Gemini provider. Use selection, then Save settings. OpenAI remains the default. Existing AI features retain their original provider and dedicated keys. A new trend draft snapshots its provider, model and approved price in the existing ai_requests table; queued requests are not silently switched.
- Test connection queues a synthetic structured-generation test through the existing editorial queue. No report or publication is created. The diagnostic uses the normal budget reservation, model price snapshot, token accounting, moderation and structured response validation. Status is polled only while a test is pending. Last verified status is cached for 10 minutes and invalidated by provider/model/credential changes. A successful test shows Connected; missing configuration, errors, unverified or expired results show Disconnected with a reason. Authentication, rate/quota, model, moderation, budget and queue problems have safe diagnostic messages. Actual Trend provider errors also update the diagnostic status. No raw provider error text or API key is sent to the browser.

## Deployment
1. Back up the database and apply `php artisan migrate` (one non-destructive seed migration for the new master-data groups). Existing settings use OpenAI by default, with no new settings table or column needed.
2. Run `npm run build`, `php artisan optimize:clear`, and `php artisan queue:restart`. Restart the existing editorial worker via Supervisor/Horizon if required; no new queue is needed.
3. The page remains `/admin/ai/career-trends` and requires `ai.manage_editorial`.
4. Existing OpenAI configuration: `OPENAI_API_KEY`; the `trend_draft` model is selected in the existing AI feature configuration. The provider requires generation and moderation permission.
5. Optional Gemini configuration in `.env`:
   - `GEMINI_API_KEY=<server-side key>`
   - `PM_AI_GEMINI_TREND_MODEL=<approved Gemini model ID>`
   - Append the exact Gemini model ID to the existing `PM_AI_ALLOWED_MODELS` comma-separated list; retain all current model IDs.
   - Publish an approved effective model-price record using the existing authorized AI model pricing endpoint (`POST /admin/ai/model-prices`), with input/cached input/output USD per million rates. Do not guess rates. The existing `trend_draft` feature must be enabled, staff-only, with an approved model, published prompt for report generation and configured global/editorial budgets. The diagnostics use a synthetic prompt and are charged against the same budgets.
   - Mandatory moderation remains on OpenAI, with `OPENAI_POST_CHECK_API_KEY` (if set) or `OPENAI_API_KEY` for Gemini; the key must permit Moderations API requests. Gemini generation uses its own key. Never paste credentials into the browser or documentation.
   - Rebuild config cache and restart workers after modifying environment variables. Then select Gemini in Manage connection, Test connection, Use selection, Save settings.
6. The existing editorial approval/publication workflow is unchanged. Weekly scheduling and automatic draft/publication remain unconnected; the provider selection applies to new drafts submitted through the existing editorial gateway. Topic, audience and other report settings are stored; this change does not activate automated report generation.

## Verification
- 286 Node static regression checks passed, including new shared-shell, editable fields, and queue/provider snapshot checks.
- PHP syntax validation of changed PHP files and new test files passed. TS/TSX transpile syntax and isolated component composition passed.
- Isolated Chromium preview: no horizontal overflow at 1536, 1280, 1024, 768, 390 and 320 px. This does not exercise the live Inertia/Radix interactions.
- New Laravel feature tests cover persistence, Gemini diagnostic metering/no draft, and OpenAI safe error messages. They could not run in this environment because `vendor/autoload.php` is absent. Production Vite build also blocked by missing `vp`. Live provider credentials/API access were not tested. Run `php artisan test --filter=CareerTrend` and test the connection locally before deployment.
