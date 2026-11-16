# PM Circle — Exam countdown progress and shared footer (16 November 2026)

## Root cause

- The timed PMP exam and embedded public sample drew the progress fill using **elapsed** time (`duration - seconds`) while the toolbar counts **remaining** time down. This made the blue fill grow instead of shrink. The paid page's fallback denominator also depended on the ticking `seconds` state.
- The centralized footer route policy excluded the entire `/exams`, `/exam-simulator`, `/simulators` and selected `/dashboard/features` route families, hiding the normal footer on simulator landing, reports/review and feature content pages.

## Implementation

- `ExamTimeProgress` is the single accessible progress display for the paid and public sample. It starts full, shrinks to zero and uses the same remaining seconds as the existing timer. Pure utilities clamp invalid/overdue values, and the paid attempt keeps its initial duration stable. No timer, autosave, scoring, authorization or result navigation behavior changed.
- `siteFooterVisibility` now permits the existing shared footer on normal public/member/learning/exam landing and report screens. **Previously approved focus exclusions remain**: guest and authenticated Home, the active paid timed attempt, and admin area. The footer uses the existing shared, cached Inertia prop and same design tokens/layout; no duplicate footer, new request or database query is introduced.
- The public PMP page still respects the administrator's existing `sections.footer` visibility switch. This update deliberately does not override admin-managed content settings.

## Tests

```sh
php tests/Regression/ExamTimerFooterStaticCheck.php
php tests/Regression/SharedFooterCoverageCheck.php
node --experimental-strip-types --test tests/Regression/examTimeAndFooter.test.mjs
npm run types:check
npm run build
```

## Verify in browser

- Start a paid exam with a known duration: the timer and bar decrease together; the bar never fills as questions advance or on page refresh; expiry ends at 0%.
- Scroll the public sample exam into view and ensure its bar also decreases.
- Visit as guest/member: Community, Members, Daily Challenge, Learning, Careers, PM Trends, Contact, Help, Profile and settings, simulator landing, simulator member dashboard, completed exam Result and Review. Each normal content screen should have **one** matching footer, below content and aligned to page grid.
- Home and the *active timed exam* remain footer-free based on the previously approved exception. Admin stays isolated. Check small viewports and short pages, and honor the admin public-footer visibility setting.

No migration, environment setting, backend route, or worker restart is required.
