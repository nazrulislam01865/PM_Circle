# PM Circle — Resume & imports review prototype alignment

## Scope

This patch is isolated to **My profile → Resume & imports**. It preserves the existing private upload, queued document extraction, review, and transactional application flow. No other profile tabs or dashboard sections are restyled, and no new packages or database migrations are required.

## UI corrections

- The **Action** column now uses a compact checkbox, fixed descriptive label, and info hint instead of an oversized dropdown. Suggested actions include Keep existing, Replace, Merge & review, Add N new, Review manually, and Import privately.
- The first checkbox column remains an optional **bulk-selection shortcut**, as shown in the prototype. The action-column checkboxes determine which fields are actually applied. Bulk selection updates the corresponding actions. The Apply count reflects action choices, not unchecked bulk markers.
- The review stepper has the connecting rules, the source line includes an extraction-review notice, and the warning and footer are aligned with the supplied prototype. The **Cancel import** action is functional and scoped to the signed-in member's ready import.
- The document summary, resume export buttons, privacy toggle, import-history row, and About imports card follow the prototype's arrangement.
- At desktop and typical laptop widths the two upload cards and the two lower columns remain side by side. On smaller screens they stack; the comparison table may scroll horizontally without forcing page-wide overflow.

## Centralized styling

The tab uses the approved PM Circle `--font`, typography scale, control heights, spacing, radii, and semantic colors. Its scoped CSS resolves the approved stable color tokens (`--pm-system-*`), avoiding conflicts with Tailwind's differently named global variables. No copy of the design-system stylesheet was introduced.

## Data, optimization, and security

`ProfileImportPresenter` compares against the already eager-loaded profile/experience/education/certification relations. It recommends **Keep existing** for unchanged values and counts only new identity-matched collection records; this introduces **no per-row queries**.

The existing Apply service continues to validate allowable actions and writes only approved extracted values in a transaction. Cancelling a ready review performs a single member-scoped database update to the import status; it does not delete uploaded documents or any profile values. Unauthorized requests receive HTTP 404. No schema changes are required.

## Changed files

- `resources/js/components/profile/ResumeImportsTab.tsx` — action checkboxes, stepper, footer, file tools, functional cancellation.
- `resources/css/pm-resume-imports.css` — scoped layout, typography, table, buttons, responsive columns, toggle.
- `app/Services/Resume/ProfileImportPresenter.php` — safe, eager-loaded change detection and labels.
- `app/Http/Controllers/Settings/ProfileController.php` — member-scoped import cancellation.
- `routes/settings.php` — authenticated cancellation endpoint.
- `tests/Feature/Settings/ResumeImportFlowTest.php` — comparison/query-count and cancellation tests.

## Installation

1. Back up the project and replace **only** the files from the changed-files ZIP while preserving paths.
2. Run `php artisan optimize:clear`.
3. Run `npm ci` and `npm run types:check`, then `npm run build` on Node.js >= 22.18.0.
4. Run `php artisan test --filter=ResumeImportFlowTest` and regression tests for profile edits.
5. Check the Resume & imports tab at desktop, tablet, and mobile widths and perform a real PDF/DOCX upload, review, cancel, and re-import test.

## Verification completed in this environment

- All changed PHP files pass `php -l`.
- The changed TSX file passes TypeScript syntax parsing and transpilation (not full application type checking).
- The CSS parses successfully.
- A static Chromium visual check of the review/bottom cards found no page-level horizontal overflow at widths 390, 768, 920, 1047, and 1440 px, and the action-control hit area is 44 px high.

**Not executed:** Laravel feature suite and full frontend build, because this extracted archive lacks Composer vendor dependencies and the offline npm cache is missing `yuku-parser@0.19.0`; this runtime also has Node.js 22.16.0, below Vite Plus's required 22.18.0. Production rendering and pixel-perfect fidelity still require browser QA against the running app.
