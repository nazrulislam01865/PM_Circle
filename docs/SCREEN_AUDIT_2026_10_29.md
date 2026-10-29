# PM Circle screen reconciliation — 29 October 2026

## Audit inputs and scope

Compared `Archive 4.zip` (source) with all 14 images in `Archive(3).zip`, plus screen inventory, functional requirements and architecture sections in `PM_Circle_Full_SRS_v1.0 (1)(3).docx` (34 pages). User-approved design tokens remain blue. Existing authenticated navigation uses exactly one `MemberDashboardLayout`. The source review is not equivalent to browser screenshots or a successful production build.

## All 14 provided design images

| Reference filename (date/time suffix) | Screen in prototype | Existing page / final route | Audit result |
| --- | --- | --- | --- |
| 1.17.37 PM (1) | Student & Beginner path modules | `learning/PathShow.tsx`, `/learning/student-beginner` | Present; source reviewed, not browser pixel-verified |
| 1.17.37 PM | Learn & practice catalogue | `learning/Catalog.tsx`, `/learning` | Present; source reviewed |
| 1.18.06 PM | Module 1 MCQ | `learning/Activity.tsx`, `/learning/{path}/modules/{module}/activities/{activity}` | Present; saved answers and server scoring |
| 10.50.55 AM | Step 1 registration | `auth/RegisterStep1.tsx`, `/register` | Present; 8-character bcrypt changes retained |
| 10.50.56 AM | Step 3 Free plan | `auth/RegisterStep3.tsx`, `/join/step/3` | Present |
| 10.50.57 AM | Step 2 professional information | `auth/RegisterStep2.tsx`, `/join/step/2` | Present |
| 10.50.58 AM | Public homepage | `public/Home.tsx`, `/` | Present |
| 10.51.01 AM | Member discussion detail | `community/PostShow.tsx`, `/posts/{post}` | Present |
| 10.51.06 AM | Daily scenario detail | `scenarios/Show.tsx`, `/scenarios/{scenario}` | Present |
| 11.15.57 AM | Step 3 Plus term selector | `auth/RegisterStep3.tsx`, `/join/step/3` | Present |
| 11.37.34 AM | Free/Plus/Pro comparison grid | `public/Pricing.tsx` + `billing/PlanComparison.tsx`, `/pricing` | **Missing full reference layout; IMPLEMENTED in this revision** |
| 12.18.06 PM (1) | Member dashboard Free | `account/Dashboard.tsx` + shared dashboard components, `/dashboard` | Present |
| 12.18.06 PM | Member dashboard Plus | Same shared dashboard, server plan or local demo view | Present |
| 12.18.07 PM | Member dashboard Pro | Same shared dashboard, server plan or local demo view | Present |

**Screen coverage:** 14 of 14 provided design references have corresponding React pages/components in this updated source. This is **source presence**, not a claim of pixel-perfect browser matching or of complete SRS functionality.

## Added screens to replace broken/placeholder destinations

| Route | UI / source | Data and access |
| --- | --- | --- |
| `/pricing` | Screenshot-matched feature comparison table with per-term Plus selection | Plan catalogue; no fabricated paid access |
| `/members` | Public member directory with search + pagination | Only active members with public profiles |
| `/members/{member}` | Public professional card, public discussions, follow/unfollow | Public fields only; private resumes and email excluded |
| `/saved-posts` | Personal saved-post list | Auth/onboarding required; published public posts saved by current user only |
| `/dashboard/features/notifications` | Notification inbox empty state | No invented notifications; actual in-app infrastructure pending |
| `/dashboard/features/achievements` | Learning record + earned-badges empty state | Counts actual learning completions; no falsely-issued achievements |
| `/dashboard/features/insights` | Activity overview | Actual own posts/saves/learning totals; no fabricated visitor identities |
| `/careers` | Career opportunities showcase | Illustrative job cards *only in local/test*, no applications or real jobs claimed |

Follow actions have an indexed, unique `member_follows` table (migration `2026_10_29_000005_create_member_follows.php`), protected by login, onboarding, anti-self-follow rules and rate limiting. No production data is replaced or deleted.

## SRS screen gaps still outstanding — NOT marked complete

The SRS goes beyond the 14 visual references. The project is an early-phase foundation and still needs:

- **P0 launch requirements:** production legal copy, restored compulsory verified-email enforcement, actual post/report moderation with authorization and audit trail, full professional profile editing and photo controls, content search with privacy rules, admin Filament, AI editorial review and jobs scheduling, production observability and permissions testing.
- **Learning and examination phase:** course authoring and versioning, gated lessons, real PMP/Scrum timed exam catalogue/instructions/attempt/autosave/review/results/history with immutable question versions and deterministic grading; full scenario AI feedback. The existing basic MCQ practice is **not** the exam engine.
- **Achievements:** award rules and idempotent issuance, badges and provenance. Existing learning progress is not an achievement award.
- **Billing:** checkout, verified payment intents/webhooks, renewal, receipts, entitlements/cost ledger. Temporary local Plus/Pro access is for development ONLY.
- **Career/AI:** real job/recruiter data, applications, secure resume library/scan/import/review, AI resume/interview and AI credit settlement.
- **Public content:** approved legal Terms/Privacy and complete accessibility/visual regression results are absent. `About` remains basic copy; not a fully provided approved design.

No screenshot was supplied for most of these future-phase pages. Implementing an arbitrary invented design and calling it an exact match would violate the approved prototype requirement. The new supporting screens reuse the existing blue theme and single member shell; future workflows require their own detailed implementation and approval.

## Verification

- PHP `php -l` checked for application, routes, config, migrations and tests.
- TypeScript/TSX syntax parsing and local-import existence checked.
- No `vendor/` or `node_modules/` in the supplied archive: Laravel feature tests, type-check, Vite build and live screenshot comparisons must be run in a configured installation.
- Run `php artisan migrate` (non-destructive; creates `member_follows`) and `php artisan test --filter=MemberDiscoveryTest` on local PostgreSQL; do not use `migrate:fresh`.
