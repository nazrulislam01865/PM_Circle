# PM Circle — AI Post Checker and Restricted-Post UI (17 November 2026)

## Scope and UI matching

This change implements the three supplied Community feed prototypes while preserving the existing PM Circle header, sidebar, avatar, post composer, card components, shared design tokens, and unrelated features.

1. **Checking your post:** after submitting a new post, the owner sees a private card with the same post text/attachment and the pale blue "Checking your post..." progress panel. No unapproved post is in the public feed.
2. **Restricted (N):** rejected posts remain visible to the author under a private red Restricted tab, with the original screenshot's policy notice, a clear reason, masked offending text and/or hidden image, Edit post, and disabled Post again action.
3. **Edit restricted post:** the shared shadcn dialog displays the restriction reason, post text editor, image replace/remove actions, correction guidance, and Post again action enabled only after a relevant edit. Reposting starts a fresh AI check; it never publishes directly.

The prototype's text states that five confirmed violations in a rolling 30-day window result in a 10-day posting, commenting, and replying restriction. This is enforced on the server. GPT-5-nano supplies a classification result, so do not represent it as a human-confirmed decision. The implementation is a minimum functional prototype; human appeals/reviews are not introduced because they were not requested.

## AI architecture

- New restricted **Responses API** key: `OPENAI_POST_CHECK_API_KEY`; GPT-5-nano (`gpt-5-nano`). Do not reuse or replace the PMP or Daily Challenge keys.
- New configuration in `config/pm-ai.php`, behind `PM_AI_POST_CHECK_ENABLED=false` until deliberately enabled. Disabling the feature retains the original publish/edit paths so a code-only deploy does not stop ordinary posting.
- After enablement, input text and optional image are sent **server-side** via a centralized Laravel post-check service. Only `/v1/responses` is called; this feature does not call `/v1/moderations` or need its key permission. Require **Responses → Write** on the new key.
- Structured JSON classification is validated against allowed statuses/categories/targets; any malformed result or provider failure fails closed, not published. Input is treated as untrusted, and provider responses are not trusted as executable instructions.
- Queue `CheckCommunityPost` uses idempotent post/version records, optimistic stale-job checks, a short admission lock for cost budgeting, limited retries, and private `check_error` status on exhausted failures. Track actual input/output tokens and estimated USD in `post_check_runs`. Images are staged privately until approval.
- Post edit of an already approved post also re-enters private checking while the feature is enabled.
- Anonymous posts that pass AI checking still enter the existing manual `pending_review` pathway, preserving the editorial process.
- Owner-only JSON polling `GET /posts/check-feed` updates statuses every 6 seconds *only while a check is pending*. Approved posts load through the existing cursor-based feed.

## Server configuration

Add to `.env` (use a new **restricted** key, never commit it):

```dotenv
PM_AI_ENABLED=true
PM_AI_POST_CHECK_ENABLED=true
OPENAI_POST_CHECK_API_KEY=sk-...your-private-key...
PM_AI_POST_CHECK_DAILY_BUDGET_USD=1
PM_AI_POST_CHECK_QUEUE=ai-editorial
PM_AI_ALLOWED_MODELS=gpt-4.1-mini,gpt-4.1,gpt-5-nano
```

The sample USD 1 budget is an operational example, not a required production allowance. Preserve all other allowed models in your existing `.env`. Budget calculations in this initial implementation use the published GPT-5-nano input/output token prices (USD 0.05/1M and USD 0.40/1M); review prices periodically if OpenAI changes its rate card.

**Recommended rollout:** Backup PostgreSQL; install the updated files; run migration with `PM_AI_POST_CHECK_ENABLED=false`; build and verify the UI/tests; configure the new restricted key, global AI and dedicated checker switches; start the Redis/Horizon `ai-editorial` worker; enable the checker. When enabled but not operational, posting fails with a clear form validation error rather than publishing unchecked content. Disable the flag to restore existing unchecked posting only when that behavior is explicitly intended.

```bash
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
npm ci
npm run types:check
npm run build
php artisan test --filter=PostAiCheckerTest
php artisan queue:restart
php artisan schedule:list
```

Run a worker if not using Horizon / Supervisor:

```bash
php artisan queue:work redis --queue=ai-editorial,ai-interactive --tries=3 -v
```

## Database impact

One new non-destructive migration: `database/migrations/2026_11_17_090000_add_post_ai_checker.php` adds `posts.check_version`, `check_category`, `check_target`, `check_reason`, `checked_at`, `restricted_at`, and index, plus three tables `post_check_runs`, `post_check_violations`, `post_check_restrictions`. No production records are deleted. Existing published posts remain published and are rechecked only when subsequently edited with the checker enabled.

## Verification and operational checks

Run as a member:

1. Create an ordinary text post with the checker enabled. Confirm blue "Checking your post..." state appears and a second user cannot find the post while pending.
2. Confirm `post_check_runs.status` changes from `queued` → `running` → `completed` and the post `status` becomes `published`.
3. Submit a clearly abusive or restricted-content *synthetic test example* in staging. Verify the author-only Restricted tab, masking, reason, disabled Post again, and editing dialog; ensure the public feed never exposes the post.
4. Correct the flagged text or remove/replace the image. Confirm the repost returns to checking and cannot become public before the second evaluation.
5. Temporarily misconfigure the test key or mock an API failure. Verify the post stays private, shows a recoverable error/retry, and neither content nor the key leaks to logs or public props.
6. Test five distinct confirmed restrictions in a disposable test database; verify ten-day posting/comment/reply restriction. Verify that ordinary members cannot query other authors' pending images or review status.
7. Check regression for original feature-disabled behavior, anonymous manual review, saved posts and reactions on approved posts, image post privacy, and unrelated Daily Challenge/PMP AI.

Read-only diagnostics:

```bash
php artisan tinker --execute="dump(DB::table('post_check_runs')->latest('id')->limit(5)->get(['id','post_id','status','model','error_code','input_tokens','output_tokens','cost_usd']));"
php artisan queue:failed
```

### Verification of this uploaded source archive

**Performed:** PHP lint on all added/modified PHP files; TypeScript/TSX syntax parsing for modified frontend files; route ordering and configuration checks. **Not performed:** Composer/PHPUnit feature test execution (uploaded ZIP has no `vendor/`), `npm run types:check`, `npm run build` (no `node_modules/`), actual OpenAI requests, browser/pixel comparison, database migration or deployment. Do not treat these as passed until verified in your local/staging setup.

## Files in this change

`app/Domain/AI/Jobs/CheckCommunityPost.php`, `app/Domain/AI/Services/PostContentCheckService.php`, `app/Domain/Community/Actions/PublishPost.php`, `app/Domain/Community/Queries/PostCheckFeed.php`, `app/Domain/Community/Services/PostCheckMedia.php`, `app/Domain/Community/Services/PostCheckPolicy.php`, `app/Domain/Community/Services/PostCheckQueue.php`, `app/Domain/Dashboard/Queries/DashboardOverview.php`, `app/Domain/Community/Queries/FeedQuery.php`, `app/Http/Controllers/Community/{PostController,PostInteractionController,PostManagementController}.php`, `app/Http/Controllers/Dashboard/DashboardController.php`, `app/Models/Post.php`, `config/pm-ai.php`, `database/migrations/2026_11_17_090000_add_post_ai_checker.php`, `routes/web.php`, `resources/js/{components/community/{PostCheckCard,FeedScopeTabs,PostComposerDialog}.tsx,components/dashboard/DashboardFeed.tsx,hooks/community/useFeedScopeCounts.ts,types/dashboard.ts}`, `resources/css/{pm-post-checker.css,app.css}`, `tests/Feature/Community/PostAiCheckerTest.php`, this guide.
