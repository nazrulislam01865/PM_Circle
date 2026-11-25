# AI Workspace connection selection and status synchronization

Baseline: Archive 11.zip. No new dependencies or migrations.

## Root cause

The shared Manage connection dialog for Daily Challenge, PMP and Feed Moderation hard-coded a disabled OpenAI dropdown. It had no control for selecting a workspace credential or model. Credential-level tests updated the workspace health record while the feature dialog only displayed its own cached full-feature diagnostic. Daily Challenge readiness also checked the default slot instead of the operation-specific primary assignment. A workspace key that is merely saved/standby is not automatically assigned to the operation; missing environment credentials therefore left the feature unconfigured.

## Changes

- `AiWorkspaceController`: safe scoped GET `/admin/ai/workspace/connection/{feature}` and PUT for the same path. Options are restricted to six existing operations, the applicable provider adapter, active provider profiles, compatible approved priced models and enabled stored credentials. A new explicit assignment requires an operation test within 15 minutes. The PUT reuses `AiFeatureRouting::save`, retains the existing backup route and daily cap, checks expected primary/model, and audits through the existing service. No new storage or parallel routing authority.
- `AiWorkspaceCredentials`: slot-filtered credential inventory and safe effective-credential health metadata. No raw keys are returned by the endpoints.
- `WorkspaceConnectionPicker.tsx`: shared lazy-loaded provider-profile, model and credential selectors; separate operation selection for generation/review and explanation/follow-up; existing credential test action, server-directed cooldown, Save connection, error states and explicit add-key link. Nothing is activated merely by testing. The selected adapter remains limited to existing production compatibility rules.
- `ConnectionControls` / `SettingsShared` / `CareerTrendSettings`: display saved credential name and workspace operation health separately from full-feature diagnostic, reload relevant props after selection or testing; preserve business settings. PMP updates the existing form's model value when a connection is saved, avoiding an accidental reversion on the next settings save.
- `FeatureConnectionStatus`: include safe health metadata and active credential identity in the diagnostic fingerprint. `TrendAiConnection` / `AiExecutionService`: prevent a queued or completed Career Trends diagnostic from being reported against a changed key/model; do not report a production backup's success as the primary's success.
- `DailyChallengeController`: readiness uses actual generation route; correct missing-credential guidance.
- `AiWorkspace.tsx`: fix empty Radix select item values in the existing Configure routing dialog.

## How to use

1. AI Workspace > API Key Management: add or choose an enabled credential on the correct routing target (Daily Challenge, Interactive, Moderation or Gemini). Test it successfully. A custom pool name does not determine routing.
2. AI Settings > relevant feature > Manage connection. Choose operation, compatible provider profile, approved model, and saved credential; test candidate when necessary; Save connection. This updates the same workspace route. The workspace default option uses the assigned slot default (including the environment fallback if configured).
3. Test connection checks the saved primary generation/explanation/moderation route through the existing feature diagnostic. For Career Trends, select and save the supported adapter first; an explicit primary of the previous adapter must be reset to the workspace default before switching, per existing validation. The second operation can be independently assigned and tested at credential level; this patch does not add separate full-workflow tests for review/follow-up. Existing backup model and budget editors remain in AI Workspace.
4. The credential health record may be verified while the full feature status remains Not tested, disabled, or failed (e.g. mandatory moderation, budget, flags or queue). These states are not interchangeable. Daily Challenge remains restricted to gpt-5-nano, Feed Moderation retains its configured mode, PMP primary remains OpenAI, and Career Trends retains OpenAI/Gemini. Server gateway/editorial/moderation enable switches and Gemini model configuration remain as before.

## Validation and deployment

- 375 source regression checks passed, including new workspace connection selection contract.
- Changed PHP and TSX syntax validated; actual Laravel integration tests and full frontend build blocked by missing vendor/node_modules. No live API calls, no browser visual verification.
- New feature test: `php artisan test --filter=WorkspaceConnectionSelectionTest`. Also run `FeatureSettingsTest`, `CareerTrendConnectionTest`, and `AiWorkspaceTest` in staging.
- Preserve existing .env, APP_KEY, database and storage. Apply patch, `php artisan optimize:clear`, `npm run types:check`, `npm run build`, `php artisan queue:restart`. No new migration; if previous workspace migrations have not been applied, they are prerequisites. Never reset the database.
- Full source archive excludes stale compiled build, runtime cache, sessions and devtools snapshots. Rebuild frontend. Patch contains only changed source/test/doc files.
