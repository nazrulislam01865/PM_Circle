# PM Circle — implementation status (29 October 2026)

Reference: `PM_Circle_Full_SRS_v1.0`, proposal baseline. Screenshots are design references. The design change explicitly approved in conversation is BLUE brand styling across all pages rather than green onboarding.

## Implemented in this delivery

- Centralized blue PM Circle design tokens and shared React UI (`resources/css/pm-circle.css`, `resources/js/components/pm`, `resources/js/layouts/pm`). Responsive homepage, community feed, post discussion, scenario, login and 3-step onboarding; starter reset and verification screens inherit the new blue layout.
- Existing Laravel 13 + Inertia 3 + React 19 + TypeScript + Tailwind 4 + shadcn components are preserved. No independent frontend service or API introduced.
- Fortify account registration and email verification retained; 8-character password minimum, normalized email, required/versioned legal acknowledgement, account profile creation. Terms/privacy *text is a placeholder*; counsel-approved text required before real registration launch. Production registration is disabled by default until `PMC_LEGAL_DOCUMENTS_PUBLISHED=true` is explicitly configured after replacing those pages.
- Step 2 profile/experience/optional certifications and private quarantined resume upload; step 3 configurable plan catalog with Free activation only. Resume scanning and paid gateway are **not implemented**; quarantined files MUST NOT be processed or exposed and paid entitlements are never activated without payment validation.
- Public post feed, author info, create-post, reply, per-user Like/Love, save, cursor paging and rate limits. Server-side verified and onboarding gates. Minimal public scenarios with written responses. No AI score is fabricated.
- Database migration for core accounts, community, scenarios and configurable plan catalog; optional sample editorial scenario in local/testing seeder, with no fabricated users or activity counts.

## Not yet implemented — required before production/general availability

- Filament administration, moderation/report workflows, full role and policy matrix, private profile editing, follow/block/search, API auditing.
- Full learning paths, timed exams, autosave and deterministic scoring, achievements and progress engine.
- Server-side OpenAI gateway, cost/credit ledger, scheduled editorial review, AI feedback, safety controls and prompt schema validation.
- Verified payment-gateway adapter, signed/replay-proof webhooks, real subscription state machine, receipts/renewals.
- Jobs/recruiter system, resume scanning/parser/review, interview assistance, private document access and deletion/consent workflows.
- Automated load/visual/a11y testing, production incident monitoring, SSR, Reverb/Horizon/Filament deployment configuration.

**Production blocker:** Do not enable production registration until genuine Terms/Privacy are reviewed and published, and the legal retention/consent rules are approved. No production checkout may be enabled without implementing/validating the provider adapter. Existing uploaded DB file is not used as the PostgreSQL target and should not be deployed.

## Architectural direction

Domain code follows `app/Domain/*`, with thin controllers in `app/Http/Controllers/*`, `FormRequest` validation, `Models` for persistence and reusable React components. Additional modules must follow the SRS phases and testable acceptance criteria, not accumulate in monolithic components. Store money as integer minor units; UTC timestamps. Payments, exam submission, achievement granting, AI credit settlement require replay-safe, transactional implementations before launch.

### Visual update (29 October 2026)
The public-facing max-width is now 1480px with a two-column main+sidebar layout on desktop. Auth and signup cards retain their original dimensions. The screenshot's homepage and member post panels were reconstructed using shared React components under `resources/js/components/home` and `resources/js/components/community`, with supporting styles under `resources/css/pm-prototype.css` (blue theme stays centralized). Local illustrative data is supplied via `database/seeders/DemoCommunitySeeder.php`; production excludes these mockups. Email verification can be enabled with `PMC_EMAIL_VERIFICATION_REQUIRED=true`. No full browser pixel-diff or end-to-end Laravel test run has occurred in this container; the implementation is not certified pixel-exact.

## Learning update (29 October 2026)

Implemented: screenshot-aligned **Learn & practice catalogue**, **Student & Beginner learning roadmap**, and **module MCQ/activity screen**, with reusable React learning components, scoped blue CSS, authenticated Laravel routes and per-member question/completion state. A small PostgreSQL learning schema and local/test-only curriculum seeder were added. These are **initial learning interfaces and a sample practice flow**; full SRS learning authoring, versioned exams, formal achievements, AI assistance and paid content management are still outstanding. See `LEARNING_IMPLEMENTATION.md` and `LEARNING_VERIFICATION.md`.

## Screen reconciliation — 29 October 2026

See `SCREEN_AUDIT_2026_10_29.md` for the complete 14-reference mapping, verified source paths, and the SRS features that are not yet implemented. This reconciliation adds the previously missing full Free/Plus/Pro comparison table and replaces generic placeholders for Members, Saved Posts, Notifications, Achievements, Profile Insights and Careers with dedicated views. Dedicated pages do not imply full backend integration for later-phase features (AI feedback, viewer tracking, exams, jobs or achievements issuance).
