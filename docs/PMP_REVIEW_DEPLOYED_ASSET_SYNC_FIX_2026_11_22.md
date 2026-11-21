# PMP review – repeated tabs after source-only fix

## Findings from `Archive(10).zip`

The member's screenshot shows multiple explanation/tab sections for the same question. The supplied `resources/js/pages/exam/Review.tsx` uses **one** `<PmpReviewExplanation>` per selected question, and `PmpReviewExplanation.tsx` has **one** `pm-review-tab-content` node with mutually exclusive content. The supplied compiled `Review-BSQA8-Bb.js` also contains exactly one explanation root and one tab panel. The source and archive cannot, on their own, explain the multi-section screenshot; stale or mismatched browser/server assets are a strong possibility. The actual deployed response was not available to inspect, so do not treat that explanation as proven.

## Patch

- A build marker (`data-pm-review-single-panel="2026-11-22"`) makes the correct component easy to identify in browser Developer Tools without displaying extra UI.
- A **scoped** rule hides additional sibling review sections if an older bundle injects redundant sections, without changing other exam pages.
- The existing compiled **Review, app loader and stylesheet** are supplied as new cache-busted assets. The Vite manifest points to these files. This ensures the fix is visible after deploying `public/build` as well as source files, even when npm is unavailable on the deployment host.
- Existing answers, scoring, navigation, four tab contents, AI chat and shared layout are unchanged. No migrations.

The compiled build files have been **surgically updated**, not freshly produced by Vite. For long-term consistency, `npm ci && npm run build` using a supported Node version will compile the same source change. Run `php tests/Regression/PmpReviewBuildSyncCheck.php` after any rebuild.

## Local deployment

1. Copy the patch while keeping the directory structure intact. Include `public/build/manifest.json`, the new assets, source files and tests.
2. Run `php tests/Regression/PmpReviewBuildSyncCheck.php` in the project directory.
3. Run `php artisan optimize:clear`.
4. Open the exam review in a fresh private window. Inspect the rendered `.pm-review-explanation`: there must be exactly one **visible** instance and one `role="tabpanel"` for the question. Switching between four tabs must replace its content, not append another section.
5. In browser DevTools -> Network, verify the loaded JavaScript includes the Review asset named by the current `public/build/manifest.json`. In Elements, the review section should contain `data-pm-review-single-panel="2026-11-22"`.

## Production precautions

- Back up the current release, but do not run database migrations for this UI fix.
- Upload **new `public/build/assets` and `public/build/manifest.json` together**. Do not upload only TSX files. Ensure Nginx serves `public/build`, and avoid reverse-proxy caching of the Vite manifest or HTML response.
- In a DigitalOcean release using rsync, copy the local tested `public/build/` directory as part of deployment. Do not point `public/build` to a previous release.
- Restart PHP-FPM only if necessary after deploy, then use `php artisan optimize:clear`. Use a hard refresh or a fresh private window if previously opened review page remains in browser memory.
- If the repeated layout persists after checking the marker and assets, capture the HTML Elements and Network responses from the running site: an extension, different deployed page, or runtime DOM alteration must then be investigated. No conclusion about such external causes can be made from this archive.

## Verification in this environment

- PHP static source assertions pass.
- Compiled Vite bundle/manifest sync check passes.
- Node `--check` passes for the new compiled assets.
- A full Laravel browser test was not run (project lacks Composer vendor and database).
- A fresh Vite build could not be produced here without the required npm dependencies; the included assets have been patched rather than rebuilt.
