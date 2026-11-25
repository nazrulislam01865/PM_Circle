# AI settings navigation and connection-test throttling

Source: supplied Archive 4.zip. No database migration or dependency change.

## Root cause and changes

- Numeric Laravel throttle middleware uses a shared authenticated-user signature. The prior 5/minute diagnostic middleware and generic 60/minute group middleware can interact with unrelated requests and Career Trends polling.
- Four diagnostic routes now replace the inherited generic throttle with named limiters. Test requests retain 5/minute per administrator, route and feature; Career Trends polling has a separate 60/minute administrator counter. All auth, verified, administrator and controller authorization checks remain. Other routes retain their prior middleware and rate limits. Career Trends budget admission and existing in-flight request reuse are unchanged.
- The shared frontend diagnostic hook prevents double submissions, parses Retry-After and displays a countdown on HTTP 429. No automatic retry or extra network request is added. Last test results remain intact after application-level throttling; provider-level errors remain distinct. Career Trends polling failures no longer manufacture a disconnected result.
- AdminLayout groups Career Trends, Daily Challenge AI, PMP Exam Simulator AI, Feed Moderation AI and AI usage management under AI settings. Clicking the parent expands/collapses it; navigating directly to an AI page expands the group and highlights the correct child. Community moderation and PMP questions & settings remain separate. Existing routes, search links and permissions are preserved. The menu uses existing centralized admin styles.

## Changed files

- app/Providers/AppServiceProvider.php
- routes/web.php
- resources/js/layouts/admin/AdminLayout.tsx
- resources/css/pm-admin.css
- resources/js/components/admin/ai/SettingsShared.tsx
- resources/js/components/admin/ai/diagnostic-retry.ts
- resources/js/components/admin/ai/useDiagnosticTest.ts
- resources/js/pages/admin/CareerTrendSettings.tsx
- resources/js/pages/admin/FeedModerationAiSettings.tsx
- tests/Feature/AI/FeatureSettingsTest.php
- tests/Regression/adminAiDiagnostics.test.mjs
- this documentation

## Verification

359/359 Node source regression checks passed (four new checks). PHP lint on three changed PHP files, TypeScript/TSX transpilation on six files and PostCSS parsing passed. The Laravel feature test covering isolated counters, Retry-After, and reset after 61 seconds is included but not executed: no vendor or node_modules in source archive, no Composer binary here. Full type-check, build, runtime and browser validation are pending. No live provider calls made.

## Apply

Overlay patch or full source onto existing project; keep .env, database and stored media. Run php artisan route:clear, php artisan config:clear, npm run build, php artisan route:list --path=admin/ai. Run php artisan test --filter=FeatureSettingsTest locally in test environment. No migration or production cache flush required. Full archive excludes stale build assets, bootstrap runtime caches, sessions, compiled views, logs and Inertia developer traces. Genuine provider quota/rate limits can still occur.
