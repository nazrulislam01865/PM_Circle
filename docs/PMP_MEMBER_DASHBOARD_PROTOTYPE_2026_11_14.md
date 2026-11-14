# PMP Member Simulator Workspace — Prototype Alignment

## Scope

The existing protected `/exams/pmp` dashboard now presents four prototype-aligned tabs: **Overview**, **Performance**, **Exam History**, and **AI Usage**. The shared PM Circle member header, question-taking flow (`exam/Take`), answer persistence, scoring, results, and review pages are preserved.

## Backend data and efficient fetching

`PmpExamController::index` validates member entitlement before executing its dashboard queries. It fetches the active question count; the 40 most recent attempts for the authenticated user (bounded, descending by ID); one grouped answer/flagged counter query across those attempts; and one grouped topic accuracy query across at most 20 completed attempts. When no relevant attempts exist, the aggregate queries are skipped. Existing dashboard shell and membership lookups remain in place. The dashboard tabs and filters are entirely client-side; switching tabs makes **zero extra HTTP requests**.

The frontend receives only counts, completed scores, and timestamps, never the question answer keys. Practice scores are calculated from real completed attempts. History times display in `Asia/Dhaka`. Histories longer than 40 attempts are currently a capped recent-history view; pagination can be introduced later if required, without querying unbounded history now.

## UI and interactions

- **Overview:** membership (Plus / Pro), recent completed/in-progress counters, exam resume and start, progress bar, optional temporary target date, and existing plan / review links.
- **Performance:** latest and average scores, relative improvement, answer pace, bounded score-trend SVG, grouped question-domain accuracy, unanswered/flagged totals, and a clearly identified practice-based suggestion.
- **Exam History:** exam type, status and date filters; Bangladesh-time columns; row-specific expansion for answered/unanswered/flagged; existing Resume/Review links.
- **AI Usage:** a clearly labeled, non-operational visual preview based on the supplied mockup. The PMP application has no implemented AI-token ledger or verified refill checkout. Demo figures and prices are marked as examples and the payment button is **disabled**. No AI calls or payment calls are made.

## Constraints and preservation

- **Unchanged:** `resources/js/pages/exam/Take.tsx`, `Result.tsx`, `Review.tsx`, `useExamStart.ts`, question schema, scoring algorithm, protected routes, membership enforcement and payment functionality.
- **No migrations** or new dependencies.
- Styling is scoped to `.pm-pmp-workspace`, with centrally defined spacing, typography, colors, radii, buttons, and icon sizes. Mobile layouts wrap or scroll horizontal data tables rather than overlapping.
- The date picker stores a preview date for the current view only; the UI explains that it is not persisted.

## Validation / rollout

After overlaying the changed files into the Laravel project:

```bash
php artisan optimize:clear
npm run types:check
npm run build
php tests/Regression/PmpWorkspacePrototypeStaticCheck.php
APP_ENV=testing php artisan test --filter=PmpExamSimulatorTest
```

Manually verify as a Plus or Pro member: four tabs, mock resume/start, zero-state if no attempts, score trend, filters/expansion, overview at tablet/mobile width, and disabled AI checkout. Verify guest and Free users cannot open `/exams/pmp`. No production deployment was performed.
