# PMP workspace typography and question review — 2026-11-25

## Scope
The uploaded guide and the copy in the project have identical SHA-256 hashes. This change reuses its compact section-heading role (1.5–2rem, 1.2 line height, Inter) for member exam page titles instead of the 2–3.1rem display heading. Overview, Performance, Exam History, AI Usage, Review and Result use the same centrally defined role. The redundant Overview and Performance pills are removed; the existing tabs and their behavior remain. Other page typography and public marketing headings are unchanged.

The workbook and legacy database store PMBOK and ECO citations in one JSON source. The review adapter separates them into two source cards without rewriting stored questions. Standard volume headings, chapter where a numeric dotted section supplies it, source section, PDF page, ECO edition/domain/task/focus/page, and secondary domains are displayed from existing data. Unrecognized ECO citation text is preserved; no invented page ranges. The shared sample review also benefits. Cards adapt to narrow member workspace widths.

## Related concepts
The 100-question original workbook fixture contains concept names, not concept descriptions or a connection paragraph. Existing semicolon-separated content remains valid. Author richer content in the existing Related Concepts field in the admin question editor or the existing Related Concepts workbook cell (no column changes). The parser supports the existing JSON schema as well as the following plain-text format. Example from the supplied prototype for PMC-PMP-0001:

```text
Shared outcome | Agree what better check-in looks like across Finance and clinic teams.
Success measures | Define how the team will track results, such as wait time and staffing levels.
How they connect: The shared outcome defines what success means. The measures show whether the project achieved it.
```

This example is not automatically written to the database. The application displays authored descriptions and connections when present; existing names remain visible and missing connections are explicitly identified. No AI or fabricated educational content is introduced. No migration or reseed is required.

## Verification and delivery
25 Node regression tests passed (review content, new title/review contract, history/AI, workbook/dashboard, exam admin/layout, public sample and project-wide source typography audit). 19 dependency-free PHP review assertions passed (prototype, single explanation, header visual checks). The archive did not include node_modules, vendor, Vite configuration, or compiled public/build. Offline npm ci failed on missing cached yuku-parser package; Node 22.16.0 also falls below vite-plus's declared 22.18 minimum. Therefore production build, full Laravel tests, and browser visual verification were not performed. Use the patch on the complete existing checkout, retaining its configuration, and run tests and build under a supported Node version before deployment. No production changes have been made.

```bash
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Existing project configuration and production secrets are not included or modified. Do not replace the complete local checkout with the supplied source snapshot or overwrite .env. Deploy the rebuilt assets along with source changes using the existing deployment workflow.
