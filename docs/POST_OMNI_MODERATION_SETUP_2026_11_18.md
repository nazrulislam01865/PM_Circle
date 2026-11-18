# PM Circle — switch community post checking to Omni moderation (18 Nov 2026)

## What the archive actually used

The 17 Nov implementation sends community posts, comments and replies to the dedicated `OPENAI_POST_CHECK_API_KEY`, but defaults to **GPT-5-nano on `/v1/responses`**. Its optional `PM_AI_POST_CHECK_EXTERNAL_MODERATION` is a *second* `/v1/moderations` call, not an alternative. Pointing a Moderations-only key at the old pipeline causes 401/403 errors at `/responses`. This change introduces `PM_AI_POST_CHECK_PROVIDER=omni` to use **only** `/v1/moderations` with `omni-moderation-latest`. The existing Responses pipeline remains the default for backward compatibility.

## Restricted API key configuration

Use a **new restricted key dedicated to Community post checking**. Give it **Moderations → Write** (or equivalent request permission). No `/v1/responses`, Models, Files, or other endpoint access is needed in Omni-only mode. This key must not be used for PMP explanations, Daily Challenge generation, or resume analysis.

Put these in the server's `.env` (example values; never commit a real key):

```dotenv
PM_AI_ENABLED=true
PM_AI_POST_CHECK_ENABLED=true
PM_AI_POST_CHECK_PROVIDER=omni
OPENAI_POST_CHECK_API_KEY=sk-REPLACE-WITH-YOUR-RESTRICTED-KEY
PM_AI_POST_CHECK_EXTERNAL_MODERATION=false
PM_AI_POST_CHECK_QUEUE=ai-editorial
```

- `PM_AI_ALLOWED_MODELS` still controls *generative* models; leave your existing list (especially PMP and Daily Challenge models) unchanged. The dedicated Omni model uses its own allowlist by exact constant rather than this generative-model list.
- `PM_AI_POST_CHECK_DAILY_BUDGET_USD` is unnecessary in Omni-only mode because OpenAI does not charge for the Moderations endpoint. The existing budget requirement and price accounting remain for `responses` mode. Rate limits still apply to Omni and should be monitored.
- Keep all unrelated `OPENAI_API_KEY`, `OPENAI_DAILY_CHALLENGE_API_KEY` and billing/AI configuration unchanged.
- Do **not** use `gpt-4o` as the model name for the Moderations API. The correct model is `omni-moderation-latest`.
- Ensure the `ai-editorial` Redis/Horizon worker is consuming queued checks; HTTP requests alone do not complete checks.

## Live provider test (no post, no database write)

In the installed Laravel application where `vendor/` is present:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan pm:post-check-test
php artisan pm:post-check-test --text='This is a harmless project status update.'
```

Optional multimodal test with an image you own and approve for transmission to OpenAI:

```bash
php artisan pm:post-check-test --text='Please review this sample image.' --image=/absolute/path/to/sample.png
```

Expected output: `Moderation request succeeded.`, `Model: omni-moderation-latest`, `Decision: approved`, `Category: none`, `Target: none` for the benign text. A moderation classification is probabilistic; it may vary. The command deliberately **does not create a post**, consume member credits, or send keys/content to the console. Do not use customer-private data for smoke tests.

If this fails:

| Error | Likely cause / next step |
| --- | --- |
| `POST_CHECK_NOT_CONFIGURED` | Set global/checker flags and dedicated key; refresh config cache and worker |
| `POST_CHECK_KEY_DENIED` | Wrong/expired API key, wrong OpenAI project, or missing `Moderations → Write` |
| `POST_CHECK_RATE_LIMITED` | Project/model rate limit; retry later or inspect provider rate limits |
| `POST_CHECK_PROVIDER_UNAVAILABLE` | HTTP/network/provider trouble; check outbound connectivity, proxy, DNS; never dump secrets |
| `POST_CHECK_INVALID_RESULT` | Unexpected moderation response format; investigate safely in staging |
| `POST_CHECK_INVALID_PROVIDER` | Set `PM_AI_POST_CHECK_PROVIDER` to `omni` or `responses` |

A basic endpoint test from the same server (optional) is:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://api.openai.com/v1/moderations' \
  -H "Authorization: Bearer $OPENAI_POST_CHECK_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"model":"omni-moderation-latest","input":"Routine project update."}'
```

This assumes the shell variable is exported; Laravel `.env` alone does **not** export it to your shell. Prefer the Artisan test. `200` indicates the request was accepted; `401/403` generally means authentication/authorization failure.

## Test the complete workflow safely

```bash
php artisan migrate:status
php artisan test --filter=PostOmniModerationTest
php artisan test --filter=PostAiCheckerTest
php artisan test --filter=CommunitySafetyPolicyTest
php artisan queue:restart
php artisan queue:failed
```

The existing GPT-5-nano feature tests run with their original/default `responses` provider. New Omni tests stub the external endpoint and verify the key/URL, unflagged publication, restricted flags, manual review, image attribution, and fail-closed behavior. This does **not** prove that the actual deployed key or Redis worker works; use the live smoke command and one synthetic staging post for that.

For staging only, create a harmless post and confirm `pending_check → published`. View run state without revealing private post content:

```bash
php artisan tinker --execute="dump(DB::table('post_check_runs')->latest('id')->limit(5)->get(['id','status','model','error_code','cost_usd']));"
```

If it stays `queued`, verify Supervisor/Horizon/Redis workers consume `ai-editorial`. If it stays `running`, check timeout, queue failures and worker logs. In `omni` mode, `model` should be `omni-moderation-latest` and `cost_usd` should be zero for new completed checks. Always back up production data and verify migrations before rollout. Drain/restart workers when changing provider and wait for in-flight jobs to finish so historic run-model labels remain accurate.

## Critical safety difference

Omni returns **harm categories** (harassment, hate, sexual, violence, self-harm, illicit, etc.), **not** a tailored JSON verdict with `spam`, `scam`, `phishing`, or context-aware Bengali/Banglish reasoning. Its labels therefore cannot replace every earlier Community Safety Criteria requirement. This switch:

- Keeps the existing author-private pending/approved/restricted/review flow, per-post version checks, comment/reply flow, and failed-provider protection.
- Maps supported flagged categories to existing restriction categories; flags outside those categories go to human `pending_review`, not strikes.
- Routes flagged comments/replies with parent/post context to human review to reduce mistaken strikes for quotations.
- Does **not** claim to detect commercial spam, account impersonation, OTP phishing, or all text embedded in images. For those requirements, keep the existing `responses` mode or approve a future two-stage Omni + context-aware generative review workflow with appropriate additional API permission.
- A model flag is an automated classification, **not** an official human-confirmed violation. Review the existing automatic 5-strike policy separately before wider production rollout.

No database schema or UI changes are required for this provider switch. Existing migration tables are reused. No live API request was executed as part of the archive patch because the user did not supply a configured runtime/key; tests are provided for execution in an installed local/staging project.
