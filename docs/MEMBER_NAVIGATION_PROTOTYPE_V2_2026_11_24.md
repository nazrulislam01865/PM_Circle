# Member navigation prototype v2 (2026-11-24)

Source: Archive 7(3).zip, PM_Circle_Member_Prototype_v2.html and the supplied PM Circle design guideline. Scope: authenticated shared sidebar and compact footer only. Existing public and admin navigation, member header functionality, and business logic are preserved.

## Menu destinations

| Group | Item | Existing destination |
| --- | --- | --- |
| | Home | `/dashboard` |
| Learn & practise | My learning | `/dashboard/learning?tab=my-learning` (existing paths tab) |
| | Browse courses | `/learning` |
| | PMP Exam Simulator | `/exams/pmp` (Plus/Pro required) |
| | Scrum Simulator | `/simulators/scrum` (existing coming-soon status) |
| | Project Simulator | `/simulators/project` (existing coming-soon status) |
| | Daily challenge | `/dashboard/daily-challenge` |
| Profile & career | My profile | `/settings/profile` (existing Overview, Edit profile, Resume & imports and Privacy tabs) |
| | Careers | `/careers` |
| | AI Resume Assistant | `/ai-resume-assistant` (existing assistant preview and member imports link, Plus/Pro menu lock) |
| | Interview preparation | `/interview-preparation` |
| | Badges | `/dashboard/features/achievements` |
| Community | Community feed | `/community` |
| | Members | `/members` |
| | Saved posts | `/saved-posts` |
| Account | Plan & usage | `/membership` (existing membership screen; consolidated usage dashboard is not part of this navigation change) |
| | Settings | `/settings/security` |
| | Activity log | `/activity-log` |
| Pinned | Help Centre | `/help-center` (existing help links and contact destination) |

The prototype uses a demo Premium plan; actual PM Circle Plus and Pro remain separate. Free members see locks on PMP and AI Resume Assistant. Locked navigation opens the shared dialog with a link to membership; it does not change backend access checks. The existing public assistant is a preview with a real resume imports link; no new AI functionality is claimed. The prototype's sample Help Centre articles, support-ticket workflow and sample plan/token figures are not imported or simulated.

## Shared design

- Text-only expanded navigation, Home followed by the four groups in exact prototype order. Learn & practise initially open, with active route group auto-opened. Existing optional collapsed icon rail and mobile drawer retained.
- Central 242px sidebar width, existing font/theme/spacing/radius/control tokens; scrollable menu body, Help Centre pinned at the bottom.
- Compact member footer sits in the workspace column, with copyright and Terms, Privacy, Refund Policy, Trademark Notice. Trademark opens the existing legal wording in a reusable shared dialog. Public footer wording remains identical and uses the same legal text constant. Member Home includes the compact footer; timed in-progress exams remain excluded.
- No new queries, dependencies, controllers, routes or migrations. Existing links remain available from their corresponding pages, e.g. profile completion/edit from My profile.

## Verification

- Node regression tests: 316/316 passed, including three new prototype tests. Earlier assertions requiring the old sidebar or full-width homepage footer were updated to the newly approved reference.
- PHP static SharedFooterCoverageCheck and ExamTimerFooterStaticCheck passed.
- Eight changed TS/TSX files transpile without syntax errors; three changed CSS files parse. No full TypeScript type check.
- 36 isolated Chromium layout checks: 320, 390, 768, 960, 1024, 1440, 1680, 2048px; short and long content, with/without offer and desktop collapsed variants. Footer remains aligned with workspace, Help Centre remains pinned, mobile drawer and no horizontal overflow verified in fixtures.
- `npm run build` attempted but failed because `vp` is not installed here. No live Laravel/Inertia route or Radix interaction test was possible. Rebuild and test locally before deployment.
