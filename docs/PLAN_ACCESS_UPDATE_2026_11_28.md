# PM Circle — compare plans and access criteria update

Source: PM_Circle_Compare_Plans.xlsm, Feature comparison sheet (38 criteria). The price sheet was reviewed; the existing pricing catalog and subscription records were retained. The 38 labels, categories, and all 114 displayed plan values match the source table exactly. Feature descriptions are carried into the comparison content; explanatory qualifications identify unavailable capabilities.

## Changes

- Public pricing and authenticated Compare Plans use the same admin-managed content, with five sections and the existing comparison styling. Admin content remains presentation-only; editing a label does not change authorization.
- The existing CurrentMemberPlan resolver determines entitlement from active terms (and configured complimentary grants). No user plan codes, subscription terms, pricing, or credit balances are rewritten.
- Courses: existing `paid` tier means Plus and Pro; `pro` is a new Pro-only tier. Existing assignments are preserved. Admin can classify courses; server reads, enrollment and progress use the tier. Free previews remain available.
- PMP: Free has the public configured sample; full simulator endpoints remain Plus/Pro. Plus uses Easy/Moderate bank questions; Pro also uses Hard. The workbook does not define advanced, so Hard is the chosen mapping. Existing attempt records are retained.
- Resume: builder, local supported-file extraction, and export available to all members; section rewrite Plus/Pro, analysis Pro. AI provider availability, workspace configuration, explicit consent and credit checks remain applicable. Legacy profile import remains subject to its existing feature flag.
- Interview: Free cannot initiate practice; Plus 5/10, Pro 5/10/20, intersected with enabled admin catalog choices. Completion/retry/answer actions recheck eligibility. Completed owned results remain readable on every plan. Existing sessions remain stored. This uses the existing interview catalog, not a new AI question-generation engine.
- Events: Plus/Pro create one event per Asia/Dhaka calendar month, including pending submissions. A user row lock and transaction serialize concurrent submissions; admin review unchanged. Owner-only registrant listing and streaming CSV (formula injection protection, no-store); registration page discloses organizer access. Before production, review privacy terms and authorization to share historical attendee contact information with hosts.
- Activity log, achievement page, and profile insights require Plus/Pro. Dashboard/profile aggregate outputs hide badges and insights for Free; learning progress itself remains available. Safety-related reporting remains available to Free. No historical records are deleted.
- Existing paid-only refill checkout retains its paid-subscription and provider requirements; Free and complimentary accounts cannot buy refills. Usage/credit summary uses existing stored data. The workbook's comparison sheet says Free refills are excluded, while its price sheet says Yes; the explicit comparison table takes precedence provisionally.

## Not complete / decisions requiring confirmation

The spreadsheet describes proposed allowances and some features that are not implemented in this source. The current AI ledger bills fixed credits; 8,000 once / 25,000 monthly / 75,000 monthly **actual tokens** are not granted or enforced. This is intentionally not converted to credits: a safe token ledger needs reservation, settlement, expiry/renewal, failure refunds, migration and billing decisions. No balance changes were made. The comparison visibly qualifies these amounts as proposed.

Scrum simulator, AI lesson assistance, standalone project scenario access tiers, separate Plus/Pro detailed exam analytics, and a fully differentiated advanced resume tailoring workflow are not fully implemented. Existing learner Q&A, profile import, Daily Challenge feedback, and other preexisting capabilities remain subject to their actual implementation/configuration; no new workflows were invented. The 38 display criteria are complete; runtime enforcement is partial. No new courses/questions were invented or reclassified. Existing historical PMP attempts may retain access for paid members after downgrade. Existing badges and learning records are retained. Free personal data and safety controls are not deliberately removed. Review the entire integration test suite and UI before deploying; the source changes are not certified production-ready.

## Migration and deployment

Migration `database/migrations/2026_11_28_120000_update_plan_access_criteria.php` replaces stored comparison row sections, notes and import copy (preserves other page sections), increments revision, adds the Pro course master option, and changes resume_rewrite minimum from pro to plus if currently pro. It does not delete existing data. The down method deliberately does not overwrite subsequent admin edits; restore the pre-migration DB backup if rollback is required. Review any custom comparison copy before running it.

Use a staging environment first, back up DB and current code/build. Use the changed-files archive as an overlay on exactly the uploaded source version. Full source ZIP excludes stale compiled `public/build` and macOS metadata; rebuild before serving. Keep `.env`, storage, and production secrets in place. No deployment was performed.

```sh
composer install
npm ci
php artisan test --filter=PlanAccessCriteriaTest
php artisan test
npm run build
# On staging, after backup and successful verification:
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
php artisan queue:restart
```

Run build with Node satisfying the installed Vite engine (22.18+ or compatible newer supported version). Review existing environment-specific deployment workflow and run migration in staging before production. Do not run db:seed or reset database simply to deploy this change.

## Verification actually completed

- Compared all 38 categories/labels and 114 cell values against workbook: no differences.
- PHP syntax validation: all 39 changed PHP files passed.
- TypeScript transpile syntax check: all 20 changed TS/TSX files, zero diagnostics of error severity. This is not a type check or build.
- Standalone entitlement matrix: 15 assertions passed (course tiers, interview counts, AI resume feature minimums).
- Added feature tests and adjusted several existing tests for changed entitlement expectations. Full test suite and production build not executed successfully: archive lacks vendor and node_modules; Composer unavailable, npm dependency cache insufficient, local Node 22.16 below Vite requirement. Remaining regression expectations may require adjustment. Database migration and UI were not run in a live Laravel environment.

## Changed paths
- `app/Domain/AI/Services/AiFeatureCatalog.php`
- `app/Domain/AI/Services/CvExtractionService.php`
- `app/Domain/Billing/Payments/Services/PaymentCheckoutService.php`
- `app/Domain/Billing/Queries/MemberFeatureAccess.php`
- `app/Domain/Billing/Queries/MemberPlanUsage.php`
- `app/Domain/Dashboard/Queries/DashboardOverview.php`
- `app/Domain/Dashboard/Queries/MemberDashboardStats.php`
- `app/Http/Controllers/Account/AccountFeatureController.php`
- `app/Http/Controllers/Account/ActivityLogController.php`
- `app/Http/Controllers/Account/ResumeAssistantController.php`
- `app/Http/Controllers/Billing/AiCreditCheckoutController.php`
- `app/Http/Controllers/Billing/TemporaryMembershipController.php`
- `app/Http/Controllers/Dashboard/DashboardController.php`
- `app/Http/Controllers/Exam/PmpExamController.php`
- `app/Http/Controllers/Interview/InterviewController.php`
- `app/Http/Controllers/Learning/DemoCourseController.php`
- `app/Http/Controllers/PublicSite/EventPreviewController.php`
- `app/Http/Controllers/PublicSite/PmpPublicPageController.php`
- `app/Http/Controllers/Settings/ProfileController.php`
- `app/Http/Requests/Admin/SaveLearningCourseRequest.php`
- `app/Http/Requests/Admin/UpdatePublicPageRequest.php`
- `app/Http/Requests/Interview/StartInterviewRequest.php`
- `app/Http/Requests/Settings/ResumeAssistantRequest.php`
- `app/Services/Exam/PmpQuestionPool.php`
- `app/Services/Learning/CourseAccess.php`
- `app/Services/Learning/CourseLessonProgress.php`
- `app/Support/Admin/HomepageMasterData.php`
- `database/migrations/2026_11_28_120000_update_plan_access_criteria.php`
- `database/seeders/PlanSeeder.php`
- `resources/js/components/billing/PlanComparison.tsx`
- `resources/js/components/billing/PricingComparisonContent.tsx`
- `resources/js/components/dashboard/DashboardSidebar.tsx`
- `resources/js/components/dashboard/memberSidebarNavigation.ts`
- `resources/js/components/learning/CourseDetail.tsx`
- `resources/js/components/learning/PublicCourseDetail.tsx`
- `resources/js/components/profile/ResumeImportsTab.tsx`
- `resources/js/data/compare-plans.json`
- `resources/js/pages/admin/LearningCourseEditor.tsx`
- `resources/js/pages/admin/LearningCourses.tsx`
- `resources/js/pages/admin/PublicPageEditor.tsx`
- `resources/js/pages/billing/Membership.tsx`
- `resources/js/pages/billing/PlanUsage.tsx`
- `resources/js/pages/events/Create.tsx`
- `resources/js/pages/events/Index.tsx`
- `resources/js/pages/events/Registrants.tsx`
- `resources/js/pages/events/Show.tsx`
- `resources/js/pages/learning/Catalog.tsx`
- `resources/js/pages/settings/profile.tsx`
- `resources/js/types/dashboard.ts`
- `resources/js/types/learning.ts`
- `routes/web.php`
- `tests/Feature/Account/MemberWorkspaceTest.php`
- `tests/Feature/Account/ResumeAssistantBuilderTest.php`
- `tests/Feature/Activity/MemberActivityLogTest.php`
- `tests/Feature/Billing/MembershipValidityTest.php`
- `tests/Feature/Billing/PlanAccessCriteriaTest.php`
- `tests/Feature/Events/CommunityEventTest.php`
- `tests/Feature/Exam/PmpPersonalDashboardTest.php`
- `tests/Feature/Interview/InterviewAdminCatalogTest.php`
- `tests/Feature/Interview/InterviewPrototypeFlowTest.php`
