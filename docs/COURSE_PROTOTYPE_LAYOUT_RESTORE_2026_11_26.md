# Course catalog and detail prototype restoration

Source: Archive 2(5).zip and PM Circle Design Guidelines supplied on 2026-11-26. The latest user request supersedes the previous requirement to show a full-width banner on individual course details.

- Shared catalog: four cards per page and four columns on sufficiently wide content rails, reducing columns on narrow rails. Removed course-count header, sample-data notice and course-development note. Illustrative metrics remain explicitly labelled within each card rather than represented as actual learner feedback.
- Catalog and enrolled-course practice: reuse AdminChoice and existing Radix Select styling; filter values, pagination reset, and practice scope/topic request payloads remain unchanged. Practice selectors use nonempty UI option values and map the all option back to the original empty state.
- Course detail: keep shared public/member shell, restore breadcrumb and inline course title, category, Save/Share actions, description and metadata next to an unboxed 16:10 image. All existing course sections, right enrollment/provider cards, permissions, and navigation retained. Browse Courses keeps the shared banner.
- CSS: existing central Inter typography, colors, spacing, control and card tokens. No additional dependencies, database queries, migrations or seeding.

## Verification

- Source regression suite: 472/474 checks passed (original archive: 471/473; the same two pre-existing PMP dashboard and legacy profile header assertions failed). Updated assertions reflect the approved changes in layout and copy; added one detail hero contract check.
- 16 targeted catalog/detail/administrator source tests passed. Three changed TSX files transpiled without syntax errors. Two CSS stylesheets parsed successfully.
- 24 Chromium representative-layout fixtures (guest/admin, catalog/details, 1668/1440/1100/1024/768/390 px): matching header/content rails, no page overflow, four tiles per page, adaptive columns, 44 px dropdown and search controls, correct banner presence and unboxed detail hero. Fixtures used the project source CSS; not a live application or dropdown interaction test.
- Full build/type check and Laravel runtime verification were not completed: npm offline install failed with ENOTCACHED and installed Node v22.16 does not meet vite-plus's minimum v22.18 requirement; Composer dependencies not supplied.

Deploy with a compatible Node version, `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear`, `php artisan optimize`. Retain the real environment, database and private storage. Stale build files, generated caches and debug/session artifacts are excluded from delivery.
