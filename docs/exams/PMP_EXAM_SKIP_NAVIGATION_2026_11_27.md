# PMP active exam workspace fixes

- The active `exam/Take` page opts out of the shared SiteHeader offer banner and offer dialog. The header, sidebar, account controls and promotions outside the active workspace remain unchanged.
- All valid question indexes are navigable, independent of answer state, through Next, Previous, navigator and the existing submission review. Skipping does not save an answer or make an additional request. Existing answer persistence, marked review, timing, authorization and scoring remain unchanged. Unanswered questions remain blank and do not earn points.
- The navigator legend uses the existing `--s3` spacing token with a selector specific enough to override `.pm-exam p`'s top-margin reset. Both real and sample exam views benefit from the spacing correction.

Verification: all 564 Node regression tests passed (including four new checks); four modified TSX files transpile without syntax errors; the updated PHP feature test passes `php -l`. The feature test covers out-of-order answers and final scoring with one skipped question; execution requires Laravel dependencies and a test database. Full TypeScript typechecking, asset build and visual browser verification were not performed here because the project dependencies are absent.

Deployment: apply the changed files to the provided source baseline, install locked dependencies if necessary, run `npm run types:check`, `npm run build`, and `php artisan test --filter=PmpExamStartSelectionTest` on staging. Clear/rebuild Laravel caches as per normal deployment. No new migration, permissions, dependencies or backend changes. The full source archive does not contain compiled frontend assets.
