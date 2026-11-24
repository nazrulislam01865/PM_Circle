# PM Circle — project-wide design-system audit
24 November 2026

## Scope and source of truth

Input: `Archive(4).zip` and `PM_Circle_Design_Guidelines (1)(20261124-091530).html`. The bundled guideline was byte-identical to the separately uploaded guide. The frontend source audit covers all 79 React page files, 289 TSX files (including pages), 562 TypeScript/TSX files, 87 CSS stylesheets, and the private text-only résumé browser preview. The prior Career Trends moderation correction was intentionally not merged. No controllers, routes, jobs, models, database files, or business logic were modified.

## Canonical design contract

| Role | Approved value / implementation |
|---|---|
| Font | Inter, system-ui, Arial, sans-serif; existing global Inter loading, static weights 400/600/700 |
| Body | 16px, 1.6 |
| H1 | clamp(32px, 5vw, 49.6px), 1.12; static 700 nearest to 750 |
| H2 | clamp(24px, 3vw, 32px), 1.2 |
| H3 / H4 | 18px / 16px; 1.35 / 1.4 |
| Lead | 17px |
| Metadata / controls | 14px; 1.6 metadata, 1.35 controls |
| Standard buttons and fields | minimum 44px; 8px radius |
| Card / feature radius | 14px / 18px |
| Primary / hover | #075db3 / #064c93 |
| Ink / body / muted | #10223d / #344861 / #52647a |
| Border / control border | #d8e3ef / #7c91ac |
| Public rail | common root token, capped at 1180px; retains approved 70.2vw desktop proportion, 90vw tablet, 16px small-screen gutter |

## Findings corrected

- Member body alias was 14px; changed to the canonical 16px body role.
- Legacy palette aliases, body/meta typography and standard control sizes now resolve to guide values.
- Removed public exam and other page-local core token redefinitions, including potentially circular aliases and separate container overrides. The public header/body/footer rail uses the same responsive root token.
- Career Trends uses the standard admin control height and metadata/control text.
- Corrected inline learning heading/body roles; shared button, label, avatar and metric chart annotations reference central tokens.
- Centralized remaining literal feature stylesheet colors, translucent shadows and tracking values; removed independent raw typography declarations. Native checkbox/radio inputs are excluded from text-field geometry.
- Maintained shared public/member/admin layout components and all existing text, actions, images and backend behavior.

## Deliberate scope boundaries

- Layout-specific structure (grid proportions, image dimensions, sticky behavior, breakpoints) is not a competing font or theme system.
- Explicit approved prototype variants (editorial/article headings, compact table/exam controls, status tones, charts, logos and graphical labels) retain centralized named roles. Moving a color or size to a token does not by itself prove all visual roles match; a full route-level computed-style review is still necessary.
- Printable résumé exports and transactional emails are distinct document/client formats, not standard application pages; their document typography is retained. The private text-only browser preview consumes central tokens but may use its system-font fallback under its existing security policy.
- Existing compiled assets are retained; rebuild before viewing the new styles.

## Verification

| Check | Result |
|---|---|
| Original regression suite | 286/286 passed before changes |
| Updated suite | 290/290 passed (286 existing + 4 new project-wide checks) |
| CSS parsing | 87/87 parsed |
| TS/TSX syntax parsing | 562/562 parsed |
| Root-token dependency audit | 1,233 base tokens inspected; no cycles detected |
| Isolated Chromium control and rail test | 320, 540, 768, 1024, 1440, 1680px; 16px body, 14px controls, >=44px standard controls, equal rails and no overflow |
| Production build | Not verified: `vp` executable missing |
| Full Laravel/React runtime, route-by-route visual parity | Not verified: project dependencies unavailable |

The browser test used shared CSS and representative public, member and admin markup, not real Inertia routes. No assertion of pixel-perfect parity across every route is made.

## All page files inspected

Each row represents source-level inventory and shared stylesheet coverage. “Shared” means the page source was not directly edited; it receives the shared design corrections where the relevant styles are used. It does not indicate live rendering was tested.

| # | Page source | Direct change / shared coverage |
|---:|---|---|
| 1 | `resources/js/pages/account/Achievements.tsx` | Shared design; source inspected |
| 2 | `resources/js/pages/account/ActivityLog.tsx` | Shared design; source inspected |
| 3 | `resources/js/pages/account/Dashboard.tsx` | Shared design; source inspected |
| 4 | `resources/js/pages/account/Insights.tsx` | Shared design; source inspected |
| 5 | `resources/js/pages/account/Notifications.tsx` | Shared design; source inspected |
| 6 | `resources/js/pages/admin/AiUsageManagement.tsx` | Shared design; source inspected |
| 7 | `resources/js/pages/admin/CareerTrendSettings.tsx` | Shared design; source inspected |
| 8 | `resources/js/pages/admin/DailyChallenge.tsx` | Shared design; source inspected |
| 9 | `resources/js/pages/admin/Dashboard.tsx` | Shared design; source inspected |
| 10 | `resources/js/pages/admin/Homepage.tsx` | Shared design; source inspected |
| 11 | `resources/js/pages/admin/InterviewCatalog.tsx` | Shared design; source inspected |
| 12 | `resources/js/pages/admin/LearningCourseContent.tsx` | Shared design; source inspected |
| 13 | `resources/js/pages/admin/LearningCourseEditor.tsx` | Shared design; source inspected |
| 14 | `resources/js/pages/admin/LearningCourses.tsx` | Shared design; source inspected |
| 15 | `resources/js/pages/admin/MasterData.tsx` | Shared design; source inspected |
| 16 | `resources/js/pages/admin/PmpPublicPage.tsx` | Shared design; source inspected |
| 17 | `resources/js/pages/admin/PmpQuestionBank.tsx` | Shared design; source inspected |
| 18 | `resources/js/pages/admin/PostModeration.tsx` | Shared design; source inspected |
| 19 | `resources/js/pages/admin/ProfileRewards.tsx` | Shared design; source inspected |
| 20 | `resources/js/pages/admin/ReactionIcons.tsx` | Shared design; source inspected |
| 21 | `resources/js/pages/admin/SiteFooterEditor.tsx` | Shared design; source inspected |
| 22 | `resources/js/pages/auth/RegisterStep1.tsx` | Shared design; source inspected |
| 23 | `resources/js/pages/auth/RegisterStep2.tsx` | Shared design; source inspected |
| 24 | `resources/js/pages/auth/RegisterStep3.tsx` | Shared design; source inspected |
| 25 | `resources/js/pages/auth/admin-login.tsx` | Shared design; source inspected |
| 26 | `resources/js/pages/auth/confirm-password.tsx` | Shared design; source inspected |
| 27 | `resources/js/pages/auth/forgot-password.tsx` | Shared design; source inspected |
| 28 | `resources/js/pages/auth/login.tsx` | Shared design; source inspected |
| 29 | `resources/js/pages/auth/register.tsx` | Shared design; source inspected |
| 30 | `resources/js/pages/auth/reset-password.tsx` | Shared design; source inspected |
| 31 | `resources/js/pages/auth/two-factor-challenge.tsx` | Shared design; source inspected |
| 32 | `resources/js/pages/auth/verify-email.tsx` | Shared design; source inspected |
| 33 | `resources/js/pages/billing/Membership.tsx` | Shared design; source inspected |
| 34 | `resources/js/pages/career/Jobs.tsx` | Shared design; source inspected |
| 35 | `resources/js/pages/career/Show.tsx` | Shared design; source inspected |
| 36 | `resources/js/pages/community/Feed.tsx` | Shared design; source inspected |
| 37 | `resources/js/pages/community/PostShow.tsx` | Shared design; source inspected |
| 38 | `resources/js/pages/community/SavedPosts.tsx` | Shared design; source inspected |
| 39 | `resources/js/pages/dashboard.tsx` | Shared design; source inspected |
| 40 | `resources/js/pages/events/Index.tsx` | Shared design; source inspected |
| 41 | `resources/js/pages/events/Show.tsx` | Shared design; source inspected |
| 42 | `resources/js/pages/exam/Browse.tsx` | Shared design; source inspected |
| 43 | `resources/js/pages/exam/Index.tsx` | Shared design; source inspected |
| 44 | `resources/js/pages/exam/Public.tsx` | Shared design; source inspected |
| 45 | `resources/js/pages/exam/Result.tsx` | Shared design; source inspected |
| 46 | `resources/js/pages/exam/Review.tsx` | Shared design; source inspected |
| 47 | `resources/js/pages/exam/Take.tsx` | Shared design; source inspected |
| 48 | `resources/js/pages/interview/Index.tsx` | Shared design; source inspected |
| 49 | `resources/js/pages/interview/Practice.tsx` | Shared design; source inspected |
| 50 | `resources/js/pages/interview/Results.tsx` | Shared design; source inspected |
| 51 | `resources/js/pages/learning/Activity.tsx` | Shared design; source inspected |
| 52 | `resources/js/pages/learning/Catalog.tsx` | Shared design; source inspected |
| 53 | `resources/js/pages/learning/CoursePractice.tsx` | Shared design; source inspected |
| 54 | `resources/js/pages/learning/CoursePracticeResult.tsx` | Shared design; source inspected |
| 55 | `resources/js/pages/learning/CourseShow.tsx` | Shared design; source inspected |
| 56 | `resources/js/pages/learning/PathShow.tsx` | Shared design; source inspected |
| 57 | `resources/js/pages/learning/SkillsCheck.tsx` | Direct typography correction + shared design |
| 58 | `resources/js/pages/learning/StartingPointResult.tsx` | Direct typography correction + shared design |
| 59 | `resources/js/pages/members/Directory.tsx` | Shared design; source inspected |
| 60 | `resources/js/pages/members/Show.tsx` | Shared design; source inspected |
| 61 | `resources/js/pages/public/About.tsx` | Shared design; source inspected |
| 62 | `resources/js/pages/public/AiResumeAssistant.tsx` | Shared design; source inspected |
| 63 | `resources/js/pages/public/ComingSoon.tsx` | Shared design; source inspected |
| 64 | `resources/js/pages/public/DiscoverPm.tsx` | Shared design; source inspected |
| 65 | `resources/js/pages/public/Home.tsx` | Shared design; source inspected |
| 66 | `resources/js/pages/public/Info.tsx` | Shared design; source inspected |
| 67 | `resources/js/pages/public/PolicyNotice.tsx` | Shared design; source inspected |
| 68 | `resources/js/pages/public/Pricing.tsx` | Shared design; source inspected |
| 69 | `resources/js/pages/public/Privacy.tsx` | Shared design; source inspected |
| 70 | `resources/js/pages/public/Support.tsx` | Shared design; source inspected |
| 71 | `resources/js/pages/public/Terms.tsx` | Shared design; source inspected |
| 72 | `resources/js/pages/scenarios/Index.tsx` | Shared design; source inspected |
| 73 | `resources/js/pages/scenarios/Show.tsx` | Shared design; source inspected |
| 74 | `resources/js/pages/settings/appearance.tsx` | Shared design; source inspected |
| 75 | `resources/js/pages/settings/profile.tsx` | Shared design; source inspected |
| 76 | `resources/js/pages/settings/security.tsx` | Shared design; source inspected |
| 77 | `resources/js/pages/trends/Index.tsx` | Shared design; source inspected |
| 78 | `resources/js/pages/trends/Show.tsx` | Shared design; source inspected |
| 79 | `resources/js/pages/welcome.tsx` | Shared design; source inspected |

## All stylesheets inspected

| Stylesheet | Status |
|---|---|
| `resources/css/app.css` | Updated |
| `resources/css/pm-about.css` | Updated |
| `resources/css/pm-activity-log.css` | Updated |
| `resources/css/pm-admin-ai-usage.css` | Updated |
| `resources/css/pm-admin-overview.css` | Inspected; unchanged |
| `resources/css/pm-admin.css` | Updated |
| `resources/css/pm-ai-resume-public.css` | Updated |
| `resources/css/pm-career-trend-settings.css` | Updated |
| `resources/css/pm-careers.css` | Inspected; unchanged |
| `resources/css/pm-circle.css` | Updated |
| `resources/css/pm-comment-thread.css` | Inspected; unchanged |
| `resources/css/pm-community-consistency.css` | Inspected; unchanged |
| `resources/css/pm-comparison.css` | Updated |
| `resources/css/pm-contact.css` | Updated |
| `resources/css/pm-course-practice.css` | Inspected; unchanged |
| `resources/css/pm-daily-challenge-admin.css` | Updated |
| `resources/css/pm-daily-challenge.css` | Updated |
| `resources/css/pm-dashboard-panels.css` | Updated |
| `resources/css/pm-dashboard-responsive.css` | Updated |
| `resources/css/pm-dashboard-shell.css` | Updated |
| `resources/css/pm-dashboard.css` | Inspected; unchanged |
| `resources/css/pm-design-tokens.css` | Updated |
| `resources/css/pm-discover.css` | Updated |
| `resources/css/pm-dropdown.css` | Updated |
| `resources/css/pm-engagement.css` | Updated |
| `resources/css/pm-events.css` | Updated |
| `resources/css/pm-exam-simulator.css` | Updated |
| `resources/css/pm-feature-pages.css` | Updated |
| `resources/css/pm-feed-scope.css` | Inspected; unchanged |
| `resources/css/pm-header-prototype.css` | Inspected; unchanged |
| `resources/css/pm-home-ai.css` | Updated |
| `resources/css/pm-home-v2-layout.css` | Updated |
| `resources/css/pm-home-v2-responsive.css` | Updated |
| `resources/css/pm-home-v2-sections.css` | Updated |
| `resources/css/pm-home.css` | Updated |
| `resources/css/pm-interview-admin.css` | Updated |
| `resources/css/pm-interview.css` | Updated |
| `resources/css/pm-learning-activity.css` | Updated |
| `resources/css/pm-learning-catalog.css` | Updated |
| `resources/css/pm-learning-core.css` | Updated |
| `resources/css/pm-learning-course-detail.css` | Updated |
| `resources/css/pm-learning-course-public.css` | Updated |
| `resources/css/pm-learning-path.css` | Updated |
| `resources/css/pm-learning-public.css` | Updated |
| `resources/css/pm-learning-responsive.css` | Updated |
| `resources/css/pm-learning.css` | Inspected; unchanged |
| `resources/css/pm-member-directory.css` | Updated |
| `resources/css/pm-member-home.css` | Updated |
| `resources/css/pm-member-navigation.css` | Inspected; unchanged |
| `resources/css/pm-member-overview.css` | Inspected; unchanged |
| `resources/css/pm-member-pages.css` | Updated |
| `resources/css/pm-member-plans.css` | Inspected; unchanged |
| `resources/css/pm-member-shell.css` | Inspected; unchanged |
| `resources/css/pm-member-sidebar-restore.css` | Updated |
| `resources/css/pm-mobile-content-polish.css` | Updated |
| `resources/css/pm-mobile-layout.css` | Inspected; unchanged |
| `resources/css/pm-notifications.css` | Updated |
| `resources/css/pm-pmp-public.css` | Updated |
| `resources/css/pm-pmp-review-prototype.css` | Updated |
| `resources/css/pm-pmp-start-dialog.css` | Updated |
| `resources/css/pm-pmp-workspace.css` | Updated |
| `resources/css/pm-post-alignment.css` | Inspected; unchanged |
| `resources/css/pm-post-checker.css` | Updated |
| `resources/css/pm-post-composer.css` | Inspected; unchanged |
| `resources/css/pm-post-management.css` | Updated |
| `resources/css/pm-post-reactions.css` | Inspected; unchanged |
| `resources/css/pm-profile-editor-prototype.css` | Inspected; unchanged |
| `resources/css/pm-profile-privacy.css` | Inspected; unchanged |
| `resources/css/pm-profile-reward.css` | Updated |
| `resources/css/pm-profile-ux.css` | Updated |
| `resources/css/pm-profile.css` | Updated |
| `resources/css/pm-prototype.css` | Updated |
| `resources/css/pm-public-layout-consistency.css` | Inspected; unchanged |
| `resources/css/pm-reaction-assets.css` | Inspected; unchanged |
| `resources/css/pm-resume-imports.css` | Updated |
| `resources/css/pm-reward-offer-dialog.css` | Inspected; unchanged |
| `resources/css/pm-signup.css` | Updated |
| `resources/css/pm-simulator-catalog.css` | Updated |
| `resources/css/pm-site-header.css` | Updated |
| `resources/css/pm-terms.css` | Updated |
| `resources/css/pm-trends-detail.css` | Inspected; unchanged |
| `resources/css/pm-trends-public.css` | Updated |
| `resources/css/pm-trends.css` | Updated |
| `resources/css/pm-ui-guideline.css` | Updated |
| `resources/css/pm-unified-engagement.css` | Inspected; unchanged |
| `resources/css/pm-unified-post-card.css` | Inspected; unchanged |
| `resources/css/pm-virtual-feed.css` | Inspected; unchanged |

## Changed-file manifest

All paths below were compared against the uploaded archive. Tests that previously asserted superseded legacy design values now verify the current guide; functional assertions are retained.

- `resources/css/app.css`
- `resources/css/pm-about.css`
- `resources/css/pm-activity-log.css`
- `resources/css/pm-admin-ai-usage.css`
- `resources/css/pm-admin.css`
- `resources/css/pm-ai-resume-public.css`
- `resources/css/pm-career-trend-settings.css`
- `resources/css/pm-circle.css`
- `resources/css/pm-comparison.css`
- `resources/css/pm-contact.css`
- `resources/css/pm-daily-challenge-admin.css`
- `resources/css/pm-daily-challenge.css`
- `resources/css/pm-dashboard-panels.css`
- `resources/css/pm-dashboard-responsive.css`
- `resources/css/pm-dashboard-shell.css`
- `resources/css/pm-design-tokens.css`
- `resources/css/pm-discover.css`
- `resources/css/pm-dropdown.css`
- `resources/css/pm-engagement.css`
- `resources/css/pm-events.css`
- `resources/css/pm-exam-simulator.css`
- `resources/css/pm-feature-pages.css`
- `resources/css/pm-home-ai.css`
- `resources/css/pm-home-v2-layout.css`
- `resources/css/pm-home-v2-responsive.css`
- `resources/css/pm-home-v2-sections.css`
- `resources/css/pm-home.css`
- `resources/css/pm-interview-admin.css`
- `resources/css/pm-interview.css`
- `resources/css/pm-learning-activity.css`
- `resources/css/pm-learning-catalog.css`
- `resources/css/pm-learning-core.css`
- `resources/css/pm-learning-course-detail.css`
- `resources/css/pm-learning-course-public.css`
- `resources/css/pm-learning-path.css`
- `resources/css/pm-learning-public.css`
- `resources/css/pm-learning-responsive.css`
- `resources/css/pm-member-directory.css`
- `resources/css/pm-member-home.css`
- `resources/css/pm-member-pages.css`
- `resources/css/pm-member-sidebar-restore.css`
- `resources/css/pm-mobile-content-polish.css`
- `resources/css/pm-notifications.css`
- `resources/css/pm-pmp-public.css`
- `resources/css/pm-pmp-review-prototype.css`
- `resources/css/pm-pmp-start-dialog.css`
- `resources/css/pm-pmp-workspace.css`
- `resources/css/pm-post-checker.css`
- `resources/css/pm-post-management.css`
- `resources/css/pm-profile-reward.css`
- `resources/css/pm-profile-ux.css`
- `resources/css/pm-profile.css`
- `resources/css/pm-prototype.css`
- `resources/css/pm-resume-imports.css`
- `resources/css/pm-signup.css`
- `resources/css/pm-simulator-catalog.css`
- `resources/css/pm-site-header.css`
- `resources/css/pm-terms.css`
- `resources/css/pm-trends-public.css`
- `resources/css/pm-trends.css`
- `resources/css/pm-ui-guideline.css`
- `resources/js/components/admin/dashboard/ActivityChart.tsx`
- `resources/js/components/pm/Avatar.tsx`
- `resources/js/components/ui/button.tsx`
- `resources/js/components/ui/label.tsx`
- `resources/js/pages/learning/SkillsCheck.tsx`
- `resources/js/pages/learning/StartingPointResult.tsx`
- `resources/views/profile/resume-preview.blade.php`
- `tests/Regression/activityLogUiGuideline.test.mjs`
- `tests/Regression/allPageTypographyCompliance.test.mjs`
- `tests/Regression/canonicalFooterOnly.test.mjs`
- `tests/Regression/designGuideSystemParity.test.mjs`
- `tests/Regression/examPublicSharedGuideLayout.test.mjs`
- `tests/Regression/homeAiBenefits.test.mjs`
- `tests/Regression/memberPublicRailFooterGrid.test.mjs`
- `tests/Regression/privacyPolicyPrototype.test.mjs`
- `tests/Regression/profileEditorPrototype.test.mjs`
- `tests/Regression/projectWideDesignCompliance.test.mjs`
- `tests/Regression/publicEventsPrototype.test.mjs`
- `tests/Regression/publicHomeLayoutCentralization.test.mjs`
- `tests/Regression/publicHomepageV2.test.mjs`
- `tests/Regression/refundPolicyPrototype.test.mjs`
- `tests/Regression/simulatorCatalogGuideCompliance.test.mjs`
- `tests/Regression/termsPrototypeGuideline.test.mjs`
- `docs/PM_CIRCLE_PROJECT_DESIGN_AUDIT_2026_11_24.md` (this audit)

## Deployment

```bash
npm ci
npm run build
php artisan optimize:clear
node --experimental-strip-types --test tests/Regression/*.test.mjs
```

Run the frontend build with a Node version supported by the existing package lock and Vite Plus. No migration or seeding is needed. Verify live public, authenticated member and admin routes at desktop and mobile widths before deploying.
