# Member AI badge hierarchy and automatic comment moderation

## Scope
Based on the previous Courses Navigation / Comment Feedback full project. Courses and Exam Simulator keep independent nested navigation and the original membership gates. AI badges are compact single-sparkle labels immediately after parent text; trailing chevrons align at the edge. Child rows are inset from the vertical guide. The shared design tokens and all routes remain unchanged.

## Moderation
When existing comment checking is enabled, new comments and replies remain invisible until approved. Confirmed violations use restricted status and the existing idempotent strike policy. Persistently uncertain automated results are restricted (not published), without a confirmed-violation strike. Clean results publish automatically, even if the optional clean-post manual approval setting is enabled. Failed provider calls retain the existing check_error/retry behavior. The post checker is unchanged. The admin settings wording now clarifies that optional manual review is for posts. Legacy pending_review comments remain hidden and are not retroactively reclassified; existing admin tools remain available for those historical records. No data migration is required. No change to global moderation enable/disable configuration.

## Verification
Node source regression suite: 415/416 passed; existing Exam Simulator counter assertion remains failing. PHP syntax and changed TSX transpilation passed. Two added Laravel integration tests cover uncertain replies and clean comments when post review is enabled; not executed because vendor dependencies are unavailable. Chromium isolated CSS fixtures verified badge proximity and no row overflow at 242, 272 and 320px sidebar widths. Production build, full type checking, live application and real provider requests were not verified.

## Deployment
Retain .env, database and private storage. Build assets with npm ci and npm run build; clear Laravel caches and restart queue workers using php artisan queue:restart (or php artisan horizon:terminate for a Horizon-managed deployment). Confirm the build manifest before visiting the application. No migration or reseeding.
