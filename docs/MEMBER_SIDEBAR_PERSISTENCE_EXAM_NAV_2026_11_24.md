# Member sidebar persistence, exam navigation and design audit — 2026-11-24

Baseline: supplied Archive 2(4).zip; design authority: PM_Circle_Design_Guidelines (1).html inside that archive. The requested new exam hierarchy supersedes the previous member prototype's flat exam entries. The other approved groups, Help Centre, member footer and public/admin navigation are unchanged.

## Implementation

- `MemberDashboardLayout.tsx` initializes the desktop collapsed state from `sidebarPreference.ts` and writes the preference when explicitly toggled. Browser localStorage is optional; an in-memory fallback survives Inertia remounts when browser storage is blocked. The mobile drawer state is separate. The preference is browser-local, not an account entitlement or database setting.
- `DashboardSidebar.tsx` and `memberSidebarNavigation.ts` implement an expandable Exam Simulator group inside Learn & practise. Existing exam routes: PMP `/exams/pmp`, Scrum/CSM `/simulators/scrum`, CAPM `/simulators/capm`, PMI-ACP `/simulators/pmi-acp`, business analysis `/simulators/business-analysis`. Scrum is moved into the nested group, not duplicated. Project Simulator stays separate. The non-PMP exam routes remain existing roadmap/coming-soon destinations. The PMP entitlement check and the resume entitlement check retain the existing server-driven values. The active exam automatically opens the nested group; it does not expand the whole sidebar.
- `MemberCompactHeader.tsx` provides the desktop expand button immediately beside the compact rail. `pm-member-sidebar-restore.css` retains the logo (without the name) in the collapsed rail, uses the existing 80px compact and 242px expanded width tokens, retains a 44px expand control and keeps mobile drawer controls independent. No new logo asset is introduced.

## Design guideline audit

The existing project-wide regression checks examine every React page and shared TSX component for independent font-family/font-size declarations, every CSS module for token-based typography, canonical root typography and control values, and conflicting core token definitions. The supplied guide supports static Inter weights 400/600/700 and nearest supported intermediate weights. These checks establish source-level centralization, not visual parity for every rendered state.

Identified and corrected visual-role mismatches:

- PMP history and AI usage panel titles: removed page-H1 override; H2 with its shared line height.
- Member home sidebar card titles: H3, not control/H4 font sizes. Shared dashboard headings use the corresponding centralized roles. Practice card heading keeps its H3 across breakpoints.
- Member learning panel titles: H3; general learning headings use H1/H2/H3 with their matching line heights.
- Profile overview and profile editor record titles: H4 rather than control-size text.
- Interview transcript labels: H4; question headings retain H3 across breakpoints.
- Member feature card padding: approved centralized card padding.
- Member navigation and brand: centralized UI font, brand title and metadata roles; logo sizing from existing shared token.

Canonical values are unchanged: Inter; page H1 clamp(32px, 5vw, 49.6px); H2 clamp(24px, 3vw, 32px); H3 18px; H4 16px; body 16px/1.6; lead 17px; metadata and standard controls 14px; standard controls at least 44px; cards 16px padding and 14px radius. Existing specialized typography roles remain available where justified by the guideline/prototypes.

## Verification

- 331/331 Node regression tests (327 baseline tests, four additional tests; obsolete flat menu expectation updated to the newly approved nested structure).
- 32 isolated Chromium layout cases: eight widths (320, 390, 768, 960, 961, 1024, 1440, 1680), expanded/collapsed preference and open/closed exam group, using actual project styles and representative markup. These are not running React/Inertia interaction tests. Footer/Help Centre alignment measured after scroll when the offer banner scrolls away at intermediate widths.
- 588 TypeScript/TSX source files parsed; 90 CSS stylesheets parsed; 87 React page source files covered by the project-wide typography regression suite. No independent typography declarations detected by those checks, except existing permitted dynamic avatar sizing.
- `npm run build` attempted; blocked by missing Vite Plus executable (`vp`). No full type check or live route tests completed. The archive has no node_modules/vendor. The actual running application still requires build and browser testing (Free/Plus/Pro, navigation, keyboard, zoom and responsive states).
- No backend, routes, database, queries or dependencies changed. Existing compiled public/build assets are retained and must be rebuilt locally. No production deployment performed.

## Apply and verify

Merge the changed files, run `npm run build` and `php artisan optimize:clear`, then hard refresh. Collapse the desktop sidebar, navigate to multiple member pages, reload and confirm the logo remains visible and sidebar remains compact. Expand it manually. Open Exam Simulator and verify each child destination, including the locked PMP popup on a Free account. Open and close the mobile drawer, then return to desktop and confirm the prior compact preference remains. Run `node --experimental-strip-types --test tests/Regression/*.test.mjs` and `npm run types:check` in the installed environment.

## Page source inventory

The following paths were included in the project-wide static typography audit; this is not a live screenshot certification.
- `resources/js/pages/account/Achievements.tsx`
- `resources/js/pages/account/ActivityLog.tsx`
- `resources/js/pages/account/Dashboard.tsx`
- `resources/js/pages/account/Insights.tsx`
- `resources/js/pages/account/Notifications.tsx`
- `resources/js/pages/account/ResumeAssistant.tsx`
- `resources/js/pages/admin/AiUsageManagement.tsx`
- `resources/js/pages/admin/CareerTrendSettings.tsx`
- `resources/js/pages/admin/DailyChallenge.tsx`
- `resources/js/pages/admin/Dashboard.tsx`
- `resources/js/pages/admin/Homepage.tsx`
- `resources/js/pages/admin/InterviewCatalog.tsx`
- `resources/js/pages/admin/LearningCourseContent.tsx`
- `resources/js/pages/admin/LearningCourseEditor.tsx`
- `resources/js/pages/admin/LearningCourses.tsx`
- `resources/js/pages/admin/MasterData.tsx`
- `resources/js/pages/admin/PmpPublicPage.tsx`
- `resources/js/pages/admin/PmpQuestionBank.tsx`
- `resources/js/pages/admin/PostModeration.tsx`
- `resources/js/pages/admin/ProfileRewards.tsx`
- `resources/js/pages/admin/ReactionIcons.tsx`
- `resources/js/pages/admin/SiteFooterEditor.tsx`
- `resources/js/pages/admin/SupportRequestDetails.tsx`
- `resources/js/pages/admin/SupportRequests.tsx`
- `resources/js/pages/auth/RegisterStep1.tsx`
- `resources/js/pages/auth/RegisterStep2.tsx`
- `resources/js/pages/auth/RegisterStep3.tsx`
- `resources/js/pages/auth/admin-login.tsx`
- `resources/js/pages/auth/confirm-password.tsx`
- `resources/js/pages/auth/forgot-password.tsx`
- `resources/js/pages/auth/login.tsx`
- `resources/js/pages/auth/register.tsx`
- `resources/js/pages/auth/reset-password.tsx`
- `resources/js/pages/auth/two-factor-challenge.tsx`
- `resources/js/pages/auth/verify-email.tsx`
- `resources/js/pages/billing/Membership.tsx`
- `resources/js/pages/billing/PlanUsage.tsx`
- `resources/js/pages/career/Jobs.tsx`
- `resources/js/pages/career/Show.tsx`
- `resources/js/pages/community/Feed.tsx`
- `resources/js/pages/community/PostShow.tsx`
- `resources/js/pages/community/SavedPosts.tsx`
- `resources/js/pages/dashboard.tsx`
- `resources/js/pages/events/Index.tsx`
- `resources/js/pages/events/Show.tsx`
- `resources/js/pages/exam/Browse.tsx`
- `resources/js/pages/exam/Index.tsx`
- `resources/js/pages/exam/Public.tsx`
- `resources/js/pages/exam/Result.tsx`
- `resources/js/pages/exam/Review.tsx`
- `resources/js/pages/exam/Take.tsx`
- `resources/js/pages/interview/Index.tsx`
- `resources/js/pages/interview/Practice.tsx`
- `resources/js/pages/interview/Results.tsx`
- `resources/js/pages/learning/Activity.tsx`
- `resources/js/pages/learning/Catalog.tsx`
- `resources/js/pages/learning/CoursePractice.tsx`
- `resources/js/pages/learning/CoursePracticeResult.tsx`
- `resources/js/pages/learning/CourseShow.tsx`
- `resources/js/pages/learning/PathShow.tsx`
- `resources/js/pages/learning/SkillsCheck.tsx`
- `resources/js/pages/learning/StartingPointResult.tsx`
- `resources/js/pages/members/Directory.tsx`
- `resources/js/pages/members/Show.tsx`
- `resources/js/pages/public/About.tsx`
- `resources/js/pages/public/AiResumeAssistant.tsx`
- `resources/js/pages/public/ComingSoon.tsx`
- `resources/js/pages/public/DiscoverPm.tsx`
- `resources/js/pages/public/Home.tsx`
- `resources/js/pages/public/Info.tsx`
- `resources/js/pages/public/PolicyNotice.tsx`
- `resources/js/pages/public/Pricing.tsx`
- `resources/js/pages/public/Privacy.tsx`
- `resources/js/pages/public/Support.tsx`
- `resources/js/pages/public/Terms.tsx`
- `resources/js/pages/scenarios/Index.tsx`
- `resources/js/pages/scenarios/Show.tsx`
- `resources/js/pages/settings/appearance.tsx`
- `resources/js/pages/settings/profile.tsx`
- `resources/js/pages/settings/security.tsx`
- `resources/js/pages/support/ContactSupport.tsx`
- `resources/js/pages/support/HelpCentre.tsx`
- `resources/js/pages/support/RequestDetails.tsx`
- `resources/js/pages/support/Requests.tsx`
- `resources/js/pages/trends/Index.tsx`
- `resources/js/pages/trends/Show.tsx`
- `resources/js/pages/welcome.tsx`
