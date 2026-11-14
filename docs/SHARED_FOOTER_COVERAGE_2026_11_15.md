# Shared footer coverage update (15 November 2026)

**Scope:** Every existing page using the site's shared navigation, including public/guest and authenticated member content, now has one common footer **except Home and simulator experiences**. The public homepage `/` and authenticated home `/dashboard` do not render it. Neither public simulator previews (`/exam-simulator/...`), the paid PMP workspace/exam/review (`/exams/...`), nor simulator status pages (`/simulators/...`) display it. The existing project/scrum workspace URLs under `/dashboard/features/` are excluded too.

**Implementation:** `SiteFooter` is reused by `PublicLayout`, `MemberDashboardLayout`, `AuthPageFrame` and the existing `DiscoverShell`. The learning shell no longer adds a second footer. `siteFooterVisibility.ts` owns the pathname policy; no server calls or additional database tables were introduced. The footer still reads the cached `siteFooter` Inertia shared prop.

**Alignment:** The footer's identity, links, newsletter and lower legal rows use the exact `.pm-container` grid shared with PM Trends, Community, Members and Contact. Removed the independent 70rem width restriction that made the footer misaligned. Guest page shells keep the footer at the bottom of short content and member shells position it below their existing full-width content. These changes do not alter the header, navigation, contact form, email or simulator logic.

**Verification:** `php tests/Regression/SharedFooterCoverageCheck.php` and the existing `ContactPageAndFooterStaticCheck.php` cover code/layout wiring. Verify public and signed-in routes on desktop and mobile using the production Vite build. Key checks: Home has no footer; PMP public, member dashboard, Take and Review have none; Members, Careers, Community, Daily Challenge, PM Trends, Contact, Pricing, Help Centre, Learning and member settings show one footer only. On short pages the footer should follow the content without an oversized artificial spacer.

**Deployment:** `npm run types:check && npm run build` then refresh the browser. No migrations, `.env` additions, queue restart, or cached content backfill.
