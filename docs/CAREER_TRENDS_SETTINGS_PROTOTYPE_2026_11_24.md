# Career Trends settings — 2026-11-24

## Scope
Authenticated admin page at `/admin/ai/career-trends`. The six settings panels, compact two-column arrangement, inline removable selections, action buttons, and responsive stack reproduce the supplied screenshot's content structure. The shared AdminLayout retains its real navigation; public header/footer are not used on restricted administration pages. The sidebar dark variant is scoped to this screen. Existing global theme tokens and shared AdminChoice/AdminMultiChoice controls are reused. Existing report and editorial routes remain unchanged.

## Persistence and security
Run `php artisan migrate` to initialize a singleton JSON configuration row. GET and PUT use the existing verified-admin middleware, throttling and `ai.manage_editorial` permission. The form request allowlists selections, requires valid date/time fields and at least one item in each multi-selection. Saves lock the singleton and write a hashed audit record transactionally. Weekly, approved-source-only, review-required, and hold-for-review are the currently supported policy choices. No credentials are passed to the browser. The connection status reports configuration presence and switches, not a network test.

## Preview / limitations
The date preview uses selected fixed-offset time zones, publication weekday, time and lead interval, skipping elapsed draft windows. `week_start` is Monday of the publication week. Preview draft shows a template outline using current unsaved values, with no AI requests. Settings are persisted but not consumed by the existing manual AI editorial workflow. The archive already has verified-source, AI draft, approval and publication APIs, but no weekly Trends scheduler or public DB-backed report listing. Those integrations are separate work; this screen does not enable them or claim scheduled publishing is running. Existing safeguards remain intact. The connection dialog explains server-side environment configuration and does not expose keys.

## Verification
283 Node regression checks passed with Node 22 `--experimental-strip-types`. PHP syntax passed for the new service, controller, request, migration, feature test and route file. Isolated TS/TSX rendering with substituted Radix/Inertia controls and icon placeholders was checked in Chromium at 1536, 1280, 1024, 768, 390 and 320px; no horizontal overflow. Full Laravel feature tests and actual Vite build were attempted but unavailable (missing vendor/autoload.php and vp). The new feature test is included for execution locally. The generated preview is an isolated layout check, not a live application screenshot.

## Local installation
Use the existing local database and environment, back up the database, then `php artisan migrate`, `npm run build`, `php artisan optimize:clear`. If permission is absent, use the existing console permission command `php artisan ai:admin-permission <admin_user_id> ai.manage_editorial` only for an authorized editorial administrator. Verify the new feature test against the dedicated test database: `php artisan test --filter=CareerTrendSettingsTest`. Do not execute RefreshDatabase tests against production.
