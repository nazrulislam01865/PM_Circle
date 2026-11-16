# PM Circle — Post comments and Daily Challenge discussion replies

## Scope

The uploaded `Archive(20261116-102933).zip` was used as the baseline. The existing post comment/reply editor, shared reaction picker, scenario controller, and UI design tokens are reused. No other routes, dashboards, exam logic, or billing code are changed.

## UI changes

- Post comments and nested post replies: the film-shaped GIF control is removed. The single image action accepts JPG, PNG, WebP, and GIF (the backend already supports these formats). No video attachment option is shown.
- Daily Challenge scenario response and its replies: both use `CommentEngagementActions`, which displays the existing 7-reaction picker and Reply button where discussion is open.
- Daily Challenge reply composer: uses `CommentComposer` in text-only mode (`allowMedia={false}`) with its existing emoji picker, inline validation, busy and error states. This preserves the scenario backend's existing text-only payload; images are **not** silently uploaded to an unsupported endpoint.
- Replying to a nested discussion reply opens the editor under that reply. The new record is stored under the original top-level response, consistent with the existing two-level thread policy (and the post thread design).
- Existing comment/reply typography and reaction styling are drawn from `pm-comment-thread.css` and shared design tokens.

## Backend behavior and privacy

- `ScenarioController::show` eager loads reaction counts and the current viewer's reaction for *all* replies. No per-reply query is added.
- The existing scenario response POST route also supports JSON for nested replies, allowing the editor to append the created reply without a page reload. All validation, authentication, `pm.member`, `verified`, `pm.onboarded`, and throttling middleware are retained.
- JSON includes only reply ID, text, date, reaction defaults, member name/ID and **public** profile fields. Private profiles are not serialized.
- The server rejects replies that point to a different scenario, to another nested reply, or to a closed discussion. Reaction ownership checks remain in `ScenarioReactionController`.
- The initial top-level response and its AI feedback workflow remain unchanged.

## Changed paths

1. `resources/js/components/community/CommentComposer.tsx` — remove film button, combine image/GIF chooser, enable reuse for text-only scenario replies.
2. `resources/js/components/community/CommentEngagementActions.tsx` — allow a provided reaction endpoint for scenario replies; preserve the original post endpoint.
3. `resources/js/pages/scenarios/Show.tsx` — add shared reply/reaction controls for root and nested replies, use the shared editor, update replies without a full page refresh.
4. `app/Http/Controllers/Scenario/ScenarioController.php` — eager load child reactions and return privacy-filtered JSON for newly created replies.
5. `resources/css/pm-comment-thread.css` — responsive layout styling using existing tokens.
6. `tests/Feature/Community/ScenarioDiscussionReplyTest.php` — integration coverage for reply posting, private profile protection, existing reaction endpoints, closed discussion, and two-level threading.
7. `tests/Regression/DiscussionCommentReuseStaticCheck.php` — dependency-free source contract checks.

## Verification locally

```bash
php tests/Regression/DiscussionCommentReuseStaticCheck.php
php artisan test --filter=ScenarioDiscussionReplyTest
npm run types:check
npm run build
php artisan optimize:clear
```

**Database:** No schema migration. **Production:** Nothing deployed or changed.

Source-level validation in this deliverable: PHP syntax, TSX parsing with global TypeScript, CSS parser, and targeted static checks passed. Full Laravel feature tests and Vite build were not run because `vendor/` and `node_modules/` were absent from the supplied archive.
