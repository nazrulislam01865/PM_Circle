# PM Circle — Community Safety Criteria (17 November 2026)

## Scope and source

Implements the four blocking criteria in the supplied Bengali reference screenshot while preserving the approved post UI and existing modular Laravel 13 architecture. The screenshot calls for Moderations API on text/images, a context-aware second-stage review on ambiguity, Bengali/Banglish keyword variants, and spam/scam heuristics. The approved implementation model for PM Circle remains **GPT-5-nano** with the existing separate `OPENAI_POST_CHECK_API_KEY`; references in the screenshot to another model are treated as review-stage behavior, not permission to change the approved model.

### Classification rules

| Signal | Review policy | Outcome |
|---|---|---|
| Harassment, threats, hateful attacks | Evaluate posted text, comment or reply; when replying, pass a bounded parent comment and post excerpt as context, not content to punish | Confirmed violation restricted; uncertain to human review |
| Adult/graphic images | Review JPEG/PNG/WebP with GPT-5-nano image input; inspect visible written text in the image; optionally use OpenAI multimodal Moderations API first | Block confirmed violations; no claim that unreadable text was accurately OCR'd |
| Bengali/Banglish/disguised insults | Normalize punctuation/spacing and use a short lexical hint list; interpret in context, including quotation/neutral discussion | Hint alone NEVER triggers a restriction/strike |
| Scam, phishing and spam | Consider links, repeated exact posts or comments in 24h, money/OTP/password solicitations and surrounding intent | A lone URL, brand, phone number or payment reference NEVER triggers automatic punishment |

A confident breach results in `restricted`; an uncertain finding gets a second GPT-5-nano opinion; if still ambiguous it is held `pending_review` with no violation counted. An administrator can approve/reject ambiguous posts, comments and replies under `Admin -> Community moderation`. A provider/validation failure leaves content unpublished (retryable `check_error`). Do not treat automatic classifications as infallible or publish before a completed review.

## Architecture and implementation

- `PostContentCheckService` centralizes Responses API calls, validates strict structured outputs and handles multilingual/multimodal classification. Prompts explicitly mark member content, parent context and heuristics as untrusted.
- `CommunitySafetySignals` provides bounded hints: obfuscated insult, links, phone, credential solicitation, advance payment and repeated exact posts/comments from the same author within one day; hints are never automatic strikes.
- `PostCheckBudget` serializes shared post/comment budget claims through Redis cache locks. Both queued job types use the same dedicated USD budget and report GPT input/output usage.
- `CheckCommunityPost` preserves the existing prototype's author-only checking, restricted and edit/repost statuses. Uncertain posts enter the existing manual queue; the admin can inspect staged images privately.
- `CheckCommunityComment` queues comments/replies privately, includes approved parent context, approves only after a completed check, and records confirmed violations idempotently. `comments.check_status` is nullable so historical comments retain their previous visibility. Approved comments affect feed stats only after approval. Nonapproved comments/replies cannot appear in previews, detail lists, reply lists, attachment downloads, comment likes, or feed counts.
- The reused `CommentComposer` displays a small pending status and privately polls its author's outcome; it does not add the comment to the public UI before approval. Existing post cards, header and restricted-post modal styles remain unchanged.
- `PostCheckPolicy` combines idempotent post and comment violations for the existing five-confirmed-violations-in-30-days → ten-day posting/comment/reply restriction rule. An uncertain case or admin rejection does not silently count as an AI-confirmed strike.

### OpenAI permissions and rollout

The screenshot's Moderations API step is supported **optionally**, not forced on the previously approved Responses-only key. To use both APIs, enable the flag only after granting `Moderations -> Write` on the dedicated post key:

```dotenv
PM_AI_ENABLED=true
PM_AI_POST_CHECK_ENABLED=true
OPENAI_POST_CHECK_API_KEY=your_dedicated_restricted_key
PM_AI_ALLOWED_MODELS=gpt-4.1-mini,gpt-4.1,gpt-5-nano
PM_AI_POST_CHECK_DAILY_BUDGET_USD=1
PM_AI_POST_CHECK_QUEUE=ai-editorial
PM_AI_POST_CHECK_EXTERNAL_MODERATION=false
```

- `false` (default): GPT-5-nano Responses API checks text and images; Moderations endpoint not called.
- `true`: **also** requests `omni-moderation-latest` on `/v1/moderations` for submitted text/image. Flagged but otherwise ambiguous results are held for human review; no automatic strike merely because the endpoints disagree. Missing permissions/provider errors fail closed. This feature is independent of Daily Challenge/PMP API keys and their moderation settings.
- The generated image description itself serves as text-in-image inspection, **not guaranteed OCR**. Tiny/obscured writing may be missed. No additional OCR service or dependency was introduced.
- Existing GIF uploads remain supported when checking is disabled. While checking is enabled, new comment GIF uploads are rejected with an ordinary validation error because the deployed image checker verifies JPEG/PNG/WebP and cannot securely review animated frames. Do not silently accept unreviewed GIF frames.

### Database, setup and deployment

**Non-destructive migration:** `database/migrations/2026_11_17_160000_add_comment_ai_checker.php`. Adds nullable check status/reason/timestamp fields to `comments`, visibility and author-recent indexes, plus `comment_check_runs` and `comment_check_violations`. Existing comments remain visible. The original post-checker migration from the previous delivery is retained.

In a development/staging environment:

```bash
php artisan migrate:status
php artisan migrate
php artisan optimize:clear
php artisan config:cache
npm ci
npm run types:check
npm run build
php artisan test --filter=PostAiCheckerTest
php artisan test --filter=CommunitySafetyPolicyTest
php artisan queue:restart
php artisan queue:work redis --queue=ai-editorial,ai-interactive --tries=3 -v
```

When deploying to production, back up PostgreSQL, verify the queue workers and migration first, and only then set `PM_AI_POST_CHECK_ENABLED=true` and restart workers. Avoid disabling the feature on a live platform without accepting that the old unchecked posting workflow would be restored. Tests should run against a disposable test DB with fake HTTP responses; do not expose API keys or real member content in test logs.

### Essential acceptance tests

1. Valid professional post → private checking → published. Other members cannot see it while pending.
2. A targeted insult in Bangla/Banglish or in a reply → restricted with contextual explanation; quoted abuse as an educational example → allowed or human-review, not an automatic strike.
3. Explicit image/graphic image and visible textual solicitation → appropriately classified; no public image endpoint while pending/restricted.
4. One URL or phone number → allowed; repeated promotional posts plus OTP/password or advance-payment solicitations → classifier considers the combined evidence rather than one keyword.
5. Comment and reply → HTTP 202, queued, author-only poll, visible and counted only after approval; parent context must not itself trigger a violation against the child reply.
6. Borderline content → second review → manual admin queue if still uncertain, and no violation count. Admin can inspect staged images and approve/reject.
7. Five confirmed post/comment violations in 30 days → existing 10-day restriction enforced on post creation, comment and reply creation.
8. 401/403/429/provider timeout, invalid structured output, missing image and worker exhaustion → safe, private error state with retry rather than public exposure.
9. Existing published posts/comments, PMP AI, Daily Challenge AI, frontend layouts and membership flows remain unchanged.

### Verification in this archive

- All modified PHP code passed `php -l` syntax validation.
- Modified TSX files passed TypeScript transpilation syntax checks.
- Cannot claim full PHPUnit, database migration, app build, OpenAI network call, or browser screenshot comparison here because the project archive has neither Composer `vendor/` nor `node_modules/`. Run the commands above in the actual local development environment.
