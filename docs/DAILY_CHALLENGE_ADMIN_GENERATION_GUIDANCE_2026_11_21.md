# Daily Challenge — administrator-controlled AI generation guidance

## Scope

This update is limited to the existing Daily Challenge AI module. It does not change AI keys, published prompt versions, pricing, publication times, review credits, the rubric or other PM Circle features.

## Controls

`/admin/ai/daily-challenge` now provides:

- Title direction, optional: a headline *theme* for unique automatically generated titles.
- Multiple allowed PMP/project domains (maximum 5) and multiple topics (maximum 8), selected from active central Master Data values.
- Optional difficulty, delivery approach and compact editorial constraints.
- An optional **exact title** in the existing manual queue-for-date form, pinned to that date when its request is first queued. Later attempts cannot silently replace an existing request.

The new values are managed under `/admin/master-data` in four Daily Challenge groups and validated on the server. The Master Data migration inserts defaults idempotently and retains any administrator-edited values on rollback.

## Generation flow

The existing scheduler calls `AiEditorialService::queueScenarioSlot()` for its daily slots. That service reads the saved settings and builds a deterministic brief: one active primary domain and one active primary topic chosen by the slot date. The date rotation spans the selected choices, which is more precise than asking the AI to cover many unrelated topics in one challenge.

A brief is embedded in the **encrypted, queued AI request**. The existing versioned prompt is extended per request with generation-specific instructions. The output remains subject to the current JSON schema, validation, moderation, budget and auto-publication gates. The application pins a manually supplied exact title, requested difficulty, and primary topic in the validated output metadata. Existing rubric scoring continues to sum to exactly 10 points.

New settings apply **only to new requests**. The scheduler can already have prepared up to eight dates (today plus seven future days). Those existing requests must not be silently rewritten or requeued, and old published challenges retain their content. For urgent time-sensitive editorial plans, select a date that has not been queued; the draft table shows existing slots. A future enhancement could introduce date-specific editorial planning and explicitly audited cancellation/replacement, but this is intentionally outside the current scope.

## Modified files

- `database/migrations/2026_11_21_000003_add_daily_challenge_generation_guidance.php` — non-destructive columns and default master choices
- `app/Support/Admin/DailyChallengeMasterData.php` — supported Master Data groups, values, and validation
- `app/Support/Admin/HomepageMasterData.php` — expose those groups through existing Master Data admin UI
- `app/Domain/DailyChallenge/Services/DailyChallengeGenerationBrief.php` — generate one date-stable, active-value-based brief
- `app/Domain/AI/Services/AiEditorialService.php` — attach the brief to queued scenario requests
- `app/Domain/AI/Services/AiGateway.php` — append focused constraints to pinned prompt at submission
- `app/Domain/AI/Services/AiExecutionService.php` — pin the exact admin title, difficulty, and selected topic metadata
- `app/Http/Controllers/Admin/DailyChallenge/DailyChallengeController.php` — validation, persistence, and props
- `resources/js/components/admin/AdminMultiChoice.tsx` — reusable keyboard-accessible multi-choice control
- `resources/js/pages/admin/DailyChallenge.tsx` — admin configuration and per-date title UI
- `resources/css/pm-daily-challenge-admin.css` — scoped responsive styles using centralized Rajdhani tokens
- `tests/Feature/AI/DailyChallengeGenerationGuidanceTest.php` — authorized updates, invalid values, rotation, immutable queue, pinning

## Installation

Apply the new migration after a PostgreSQL backup. No existing data is deleted.

```bash
php artisan migrate
php artisan optimize:clear
php artisan test --filter=DailyChallengeGenerationGuidanceTest
npm ci
npm run build
php artisan queue:restart
```

Keep `.env` and API keys server-side. Verify the admin screen with a **new** date outside the already queued range in a non-production environment before enabling auto-publication.
