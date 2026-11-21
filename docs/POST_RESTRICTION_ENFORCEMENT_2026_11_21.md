# PM Circle — Community posting restriction enforcement (21 November 2026)

## Scope

Uses existing `post_check_violations`, `comment_check_violations`, and
`post_check_restrictions` tables. **No migration, seeder, scheduled cleanup, or
new dependency is required.** The existing site UI tokens and centralized
Rajdhani font remain unchanged.

## Policy

- Default **five confirmed violations within 30 days** cause a **10-day** restriction.
- Confirmed post violations, confirmed comments, and confirmed replies contribute
  to the same count. Rejected ambiguous content counts **only after an admin
  explicitly rejects it**; approved content and reported-but-unconfirmed posts
  are not strikes.
- Duplicate job deliveries cannot count the same post revision/comment twice.
  The unique ledger keys and a short member-row lock serialize concurrent confirmations.
- While blocked, members cannot create or update posts, repost restricted posts,
  retry posting/checking, create comments or replies, or submit Daily Challenge
  scenario responses or replies. Reading, saving, reporting, and reacting remain
  available.
- Further confirmations **do not move an existing restriction deadline**.
  The restriction lifts automatically when `blocked_until` passes; another block
  requires five *new* confirmed strikes within a rolling 30-day window after the
  previous restriction began. Historic strikes still exist for audit purposes.
- Members can see the current policy, their recent strike count, and their
  restriction expiry on the Restricted tab and on the regular feed if blocked.
  The member post composer is disabled while blocked; the backend remains the
  authoritative enforcement point for every protected POST endpoint.

The values are available from `config/community.php`. Optional environment settings:

```dotenv
PMC_POST_RESTRICTION_THRESHOLD=5
PMC_POST_RESTRICTION_WINDOW_DAYS=30
PMC_POST_RESTRICTION_DURATION_DAYS=10
```

No environment changes are needed to retain the stated default policy. If
changed, run `php artisan config:clear` (and rebuild cached config as appropriate).

## Changed source

- `config/community.php`: centralized policy settings.
- `app/Domain/Community/Services/PostCheckPolicy.php`: consistent enforcement,
  idempotent serial recording, fixed-duration automatic restrictions and renewal.
- `app/Http/Controllers/Admin/PostModerationController.php`: confirmed human
  rejections enter the same strike ledger; approvals are not penalized.
- `app/Http/Controllers/Scenario/ScenarioController.php`: apply community
  contribution restriction to scenario responses and replies.
- `app/Domain/Community/Queries/PostCheckFeed.php`: the existing owner-only
  moderation feed exposes configurable policy data for display.
- `resources/js/components/dashboard/{DashboardFeed,DashboardComposer}.tsx` and
  `resources/js/pages/account/Dashboard.tsx`: visible restrictions and composer state.
- `resources/js/components/community/{PostCheckCard,PostComposerCard}.tsx`:
  shared disabled states when the author is blocked.
- `resources/css/pm-post-checker.css`: minimal responsive, token-based styles.
- `tests/Feature/Community/PostingRestrictionPolicyTest.php`: five/rolling-window,
  idempotency, non-extension, expiry, protected writes, and human-review cases.

## Deployment / verification

1. Make a PostgreSQL backup and deploy the changed source.
2. Run `composer install` if needed, and `php artisan optimize:clear`.
3. Run `php artisan test --filter=PostingRestrictionPolicyTest` and existing
   `PostAiCheckerTest` and `CommunitySafetyPolicyTest`.
4. Rebuild assets with supported Node (`npm ci && npm run build`) and deploy
   `public/build` with the source. Restart queues if worker code was deployed.
5. Confirm in a test account: fourth strike does not block, fifth does; confirm
   posts/comments/replies fail while blocked, and confirm expiry automatically.

**Not done here:** production deployment or real database feature tests. This ZIP
lacks Composer `vendor/`; frontend production assets must be rebuilt locally.
