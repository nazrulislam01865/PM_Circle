# AI Workspace completion update — 2026-11-25

Baseline: Archive 9.zip; PM_Circle_AI_Management_Original_Design_Revised(3).html. Existing PM Circle admin layout and centralized design controls retained. A separate additional document was not accessible.

## Page coverage

- Overview: real metrics, seven-day activity, global and provider-level spending, feature assignments including backup.
- Providers: existing provider profile creation/configuration, counts, filtered key navigation, trusted OpenAI/Gemini/Anthropic adapters.
- Credentials: encrypted write-only secrets, environment and registry Test/Edit/Rotate, free-text pool label, explicit routing target, priority, daily cap, tested activation. Provider changes or disabling must not invalidate assigned routes.
- Models: provider, identifier, display name, capabilities, Active/Standby/Disabled, approved price/allowlist controls. Embeddings and Vision are registry classifications; no standalone embedding or vision feature was specified in the prototype. Existing multimodal moderation is preserved.
- Feature configuration: operation-specific primary credential/model, explicit backup credential/model, primary-only or priority failover, feature daily cap. Configure also links to existing feature settings. Existing feature primary-provider constraints and model restrictions remain, including Daily Challenge pinned model and moderation safety. Claude is an approved backup for compatible text-generation operations only. Gemini remains supported for Career Trends; direct CV/moderation backup uses the same supported OpenAI adapter/model. Arbitrary endpoints and unknown adapters are not accepted.
- Budget: global daily and optional monthly USD caps, feature and credential caps, existing editorial/moderation and Free/Plus/Pro member credit controls. Ledger reserves estimated costs atomically before requests; actual known costs settle afterward. Admission estimates are not provider invoice guarantees.
- Usage: gateway and paid direct moderation/CV requests use common accounting; provider/credential spend, request activity and export. Current-month recorded gateway and moderation costs are carried forward. Historical unrecorded CV costs and unknown credential attribution cannot be reconstructed. Legacy disabled-gateway code paths are not converted into new active AI features.
- Health: credential checks, runtime failure/recovery audit events, bounded backoff, deduplicated active administrator alerts. Safe backup selection is explicit, not unrestricted automatic switching across keys. No repeat paid call on ambiguous outcome. Moderation remains fail-closed.
- Audit: existing paginated records and new configuration/runtime events, no secrets or private prompts.

## Operational prerequisites

Back up PostgreSQL, .env, APP_KEY and storage. Stop incoming AI requests and pause scheduler and workers; drain active AI jobs before the migration (including synchronous CV extraction and moderation). Additive migrations 000008 and 000009 migrate financial balances and allocation history. They are forward-only: do not run migrate:rollback against these financial changes. Restore a verified backup under maintenance if recovery is necessary. Do not reset/seed the database. Preserve the original APP_KEY to decrypt existing credentials.

Run composer install, npm ci (Node 22 compatible), php artisan optimize:clear, php artisan migrate, npm run types:check, npm run build, and php artisan test --filter=AiWorkspace. Run the remaining AI feature/integration tests in a separate test database. Restart workers and resume scheduler only after verification. Use the existing permission controls for financial and pricing changes. Configure positive global and applicable feature/credential/moderation limits, and approve prices for paid CV models and any new backup model. To enable Claude backup, activate an approved Anthropic provider profile, test a saved key, register and approve the compatible model and its current provider price, then select the backup in a supported operation. No live provider calls were made here.

A configured monthly limit is optional for backward compatibility. Blank means no separate monthly ceiling. Zero prevents paid admission. Unknown provider outcomes retain financial holds for operator reconciliation; do not release them without confirming the provider outcome. Budget windows use UTC. Existing exam bank, scoring, timers, subscription credits, private CV consent and moderation policies are preserved by scope.

## Verification scope

Static source regression tests and syntax checks are not full Laravel/PostgreSQL/Redis integration tests or a production frontend build. Exact visual parity has not been browser-verified. New integration tests cover monthly admission and unknown/feature holds, but require the installed application dependencies. Review the supplied verification results before deploying.
