# PM Circle — Authenticated Three-Level Navigation

## Scope

This change alters **member navigation only**. It leaves the public/guest navigation, administrator dashboard, backend feature logic, AI gateways, payment entitlements, and database schema unchanged. The same shared `MemberHomeHeader` and design-token CSS are reused.

## Navigation contract

1. **Primary:** Home · Challenge · Community · Learn · Exams (Lucide icon + one word, no section dropdown). Header retains branding, profile reward, search, notifications, account tools, and utility menu.
2. **Secondary:** one horizontally scrollable, text-only row directly below the authenticated header; links are selected using the current Inertia route and relevant query parameters. Blue underline marks the active item.
3. **Tertiary:** page-owned tabs and filters stay inside the page (e.g. Community: All / Following / My posts / Hidden / Restricted; PMP: Overview / Performance / Exam History / AI Usage; Challenge: scenario filters; Learning: catalog tabs). No new duplicated filter components.

### Secondary destinations

| Primary | Secondary labels | Existing behavior / destination |
| --- | --- | --- |
| Home | Overview, My profile, Achievements, Profile insights, Settings | Authenticated dashboard, profile, achievement, insight and security settings routes |
| Challenge | Daily Challenge, My participation | Member scenario library and its existing `tab=mine` filter |
| Community | Feed, Members, Topics, Saved posts, My activity | Member dashboard feed; member directory; public community topic browsing in authenticated shell; saved posts; existing member insights/activity summary |
| Learn | Course library, My learning, Practice, Project simulator, Interview preparation | Member course catalog tabs; existing project-simulator status and interview pages |
| Exams | PMP Exam Simulator, Scrum Simulator, BA Simulator | PMP member workspace; existing Scrum status page; BA explicitly disabled (not a fake destination) |

Notes:
- The Community Feed primary link is `/dashboard?view=community`, preserving the approved authenticated composer + feed layout. The `view` query parameter selects navigation only; it does not introduce a second feed query.
- The topic browser is the existing `/community?topic=All` page. Signed-in members receive the member header there, while guests keep the original public header. No new topic tables or routes were introduced.
- "My activity" reuses `/dashboard/features/insights?view=community`, where recorded posts, replies, challenges, and practice participation are already shown.
- Public homepage, public Learning/Challenge landing URLs, marketing pages, and guest Community continue to use the existing public header; admin uses its existing separate layout.
- The focused PMP taking page uses the same authenticated primary/secondary bars and retains its exam tool/timer toolbar immediately below them. No countdown or exam-answer logic changes.

## Affected files

- `resources/js/components/dashboard/memberNavigation.ts`: single, pure typed route-to-section/secondary link mapping.
- `resources/js/components/dashboard/MemberSecondaryNavigation.tsx`: reusable text-only member secondary navigation.
- `resources/js/components/dashboard/MemberHomeHeader.tsx`: fixed authenticated five-item primary; preserves the original guest/public rendering branch.
- `resources/js/layouts/pm/MemberDashboardLayout.tsx`: mounts the secondary bar after the primary header.
- `resources/js/components/pm/SiteHeader.tsx` and `resources/js/pages/exam/Take.tsx`: authenticated exam-taking header variant.
- `resources/js/components/dashboard/DashboardFeed.tsx`: retain Community active state across in-page feed filter navigation.
- `resources/js/pages/community/Feed.tsx` and `app/Http/Middleware/HandleInertiaRequests.php`: authenticated Community topic browsing uses the member shell, guest layout unchanged.
- `resources/js/pages/account/Dashboard.tsx`: offset the existing sticky profile cards below both navigation bars.
- `resources/css/pm-member-navigation.css` and `resources/css/app.css`: scoped token-based layout, responsive overflow, and sticky offsets.
- `tests/Regression/memberNavigation.test.mjs`: navigation/link/third-layer regression checks.

## Deployment

1. Back up the relevant frontend and middleware files or apply the changed-files archive in a branch.
2. Ensure Node is compatible with the project's installed dependencies (some currently require **22.18.0 or newer**; installed versions take precedence).
3. Run:

```bash
npm ci
npm run types:check
npm run build
node --experimental-strip-types --test tests/Regression/memberNavigation.test.mjs
php -l app/Http/Middleware/HandleInertiaRequests.php
php artisan optimize:clear
```

No migration, database backfill, cache seeding, new queue, or `.env` change is required. If the built assets are deployed separately, publish the fresh Vite `public/build` output by your existing deployment process.

## Browser QA checklist

- As a member, open `/dashboard?view=community`: Primary **Community**, secondary **Feed**, page-level **All** are active. Change to Following, My posts, and Hidden; the two navigation layers must stay consistent.
- Select Members, Topics, Saved posts, and My activity in sequence; each link must load the existing feature and highlight itself.
- On Home, Challenge, Learn, and Exams, confirm that the correct primary section is highlighted and each secondary destination opens. PMP workspace tabs must remain below the secondary bar.
- Review a timed PMP attempt, ensure the header is paired correctly, and verify countdown/answer/save/finish behavior is unaffected.
- Verify dashboard right-side profile cards and the feed filter bar do not overlap the sticky secondary navigation when scrolling.
- Verify narrow laptop, tablet, and mobile widths: primary collapses into the existing menu when needed, while secondary stays a single horizontal row with accessible scrolling.
- Visit the public homepage and public Community as a guest, and visit administrator pages. Their existing navigation must remain unchanged.

## Verification in this archive

- Node regression tests: **5 passed**.
- Changed TS/TSX syntax parsing: **passed** using TypeScript parser.
- Middleware PHP lint: **passed**.
- Full TypeScript type check, frontend production build, Laravel feature tests and screenshot comparison: **not verified** because the frontend dependency install did not finish in the isolated environment (Node 22.16.0; dependencies request Node >=22.18.0). Do not treat this code as deployed or browser-verified.
