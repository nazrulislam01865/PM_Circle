# PM Circle — Exam Review and Shared Header Visual Fix

**Date:** 2026-11-16  
**Basis:** The latest supplied `Archive 3(6).zip` and three annotated UI screenshots.  
**Scope:** The PMP question-review score donut; shared header profile-reward promotion badge; shared navigation dropdown mouse-leave behavior. No redesign or new feature.

## What changed

1. **Question review summary:** Split the circular score center into its number and a separately styled `Questions` label. Center both vertically and horizontally in the existing 80 px ring and use a smaller type token (`--text-donut-label`) so the label does not run across the circular progress ring. The score, ring colors and calculation remain unchanged.
2. **Header reward badge:** Reuse the existing profile reward's gold background and border tokens, rather than the exam navigation's peach tokens. Use the standard ink token for accessible text contrast, and preserve the gift icon and existing destination.
3. **Shared dropdowns:** Close the native `<details>` element when the pointer leaves the entire group, not when crossing from the trigger to its submenu. Apply consistently to Community, Learn & Practice, Exam Simulator and the utility menu. Remove the CSS `:focus-within` display shortcut that kept a closed dropdown visible when its trigger still had mouse focus. Click/tap activation, Escape handling, and keyboard navigation through an open `<details>` remain supported; mobile touch interactions are not auto-closed by hover logic.

## Existing source files changed

- `resources/js/components/exam/ExamShared.tsx` — explicit centered donut label.
- `resources/css/pm-pmp-review-prototype.css` — scoped text layout for review donut.
- `resources/css/pm-design-tokens.css` — compact label font token; other tokens unchanged.
- `resources/css/pm-profile-reward.css` — header reward badge in approved gold palette.
- `resources/js/components/dashboard/MemberHomeHeader.tsx` — dropdown mouse-leave dismissal for four menus.
- `resources/css/pm-member-home.css` — remove stale focus-within dropdown visibility override.

## Added regression check

- `tests/Regression/PmpReviewHeaderVisualFixTest.php` — asserts the three fixes and retained keyboard activation styling.

## Verification performed locally

- `php tests/Regression/PmpReviewHeaderVisualFixTest.php` — **PASS** (four checks).
- `php tests/Regression/PmpReviewPrototypeStaticCheck.php` — **PASS** (seven checks).
- `node --experimental-strip-types --test tests/Regression/pmpReviewContent.test.mjs` — **PASS** (four checks).
- TypeScript transpilation/syntax diagnostics for both changed `.tsx` files — **PASS**.
- PostCSS parse of all four relevant stylesheets — **PASS**.
- Diff of original archive vs updated source — **exactly six existing files modified**.

Not verified here: full `npm run types:check` and `npm run build` (archive lacks installed dependencies); production runtime; pixel comparison in a running app. The headless Chromium smoke screenshot timed out in the execution environment. No database migrations or server changes are required.

## Safe local rollout

From your PM Circle project root, back up current files, apply the changed-files archive while preserving directory paths, then run:

```bash
php tests/Regression/PmpReviewHeaderVisualFixTest.php
php tests/Regression/PmpReviewPrototypeStaticCheck.php
node --experimental-strip-types --test tests/Regression/pmpReviewContent.test.mjs
npm ci
npm run types:check
npm run build
php artisan optimize:clear
```

Use a Node version compatible with `package.json` packages (Node 22.18+ or an approved Node 24 version). Run the full frontend build before refreshing the page; clear browser caches if the old bundle is still served. Validate the score donut on desktop/mobile, the badge in guest/member headers, and each dropdown using hover, click and keyboard. Do not deploy automatically; stage and inspect first.
