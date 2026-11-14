# PM Circle - shared header prototype implementation

Scope: header only. The PMP public landing page, sample questions, plans, FAQs, videos and testimonials were intentionally not implemented in this update.

## Source of truth

- `resources/js/components/dashboard/MemberHomeHeader.tsx` is the reusable header rendered by `SiteHeader`, `MemberDashboardLayout`, public layouts, authentication pages, Discover pages, and the exam-taking screen.
- `resources/css/pm-header-prototype.css` contains the shared header overrides.
- `resources/css/pm-design-tokens.css` defines the three exam-menu accent tokens. Existing typography, spacing, dimensions and colors use approved tokens.
- `resources/css/pm-member-home.css` was changed only to prevent a main icon from rotating when its dropdown opens.

## Delivered

- Navigation: Home, Daily Challenge, Community, Learn & Practice, Exam Simulator, Careers, Members.
- Matching Lucide outline icons, including clipboard for Exam Simulator, monitor for PMP, headphones for Scrum and a vertical chart for BA.
- Exam Simulator is a separate lightly orange dropdown. The existing PMP page is linked at `/exams/pmp`; the existing member-only Scrum feature is at `/dashboard/features/scrum`. BA Simulator is visibly disabled until a real BA route is provided.
- Right-hand utility menu: PM News links to the existing `/pm-trends` page. Help Center and Contact Us are visibly disabled because dedicated destinations are not in this project snapshot; no fake route is invented.
- Existing member search, notifications, avatar and account dropdown remain intact; guest login and registration remain intact. Admin area remains separately protected and is not redesigned.
- One mobile hamburger menu contains the same navigation and utility labels; the desktop utility menu is hidden at the mobile breakpoint to avoid duplicate hamburger controls.
- Exam-taking page now highlights Exam Simulator instead of Learn & Practice. No exam processing behavior was changed.

## Verification

- `php tests/Regression/SharedHeaderPrototypeStaticCheck.php` - passed in the editing environment.
- TypeScript TSX transpilation (syntax diagnostics) - passed for two touched files.
- PostCSS parsing - passed for all changed CSS files.
- Full Vite build and interactive browser QA - not performed in editing environment because project `node_modules` was not included and the available headless browser timed out.

## Local deployment checks

```sh
npm ci
npm run types:check
npm run build
php tests/Regression/SharedHeaderPrototypeStaticCheck.php
```

Inspect desktop widths >= 1401px and mobile/tablet widths <= 1400px, including guest and member controls, dropdown keyboard/hover behavior, and layout overflow. No migration, new database table, production command or additional backend query is required.
