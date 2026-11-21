# Public homepage — side-by-side screenshot alignment

Source: `Archive 4(5).zip`, compared with the two screenshots supplied on 2026-11-21 (left: running project; right: reference).

## Root causes corrected

1. Footer icon stack: `.pm-v2-footer-grid nav` applied `flex-direction: column` to the nested social-media nav. This now applies only to direct column nav children; social icons have an explicit horizontal 40px ring layout.
2. Footer missing Company column: the pre-existing link classifier generated an empty Company list for certain admin configurations. The homepage now adds links to verified existing About, Contact and Help Centre routes **only when** no company links were configured and the section is enabled; configured labels/links and disabled sections still take priority.
3. Footer/logo size and shape: the generic logo showed a white vertical line that does not appear in the reference. The homepage ring is adjusted locally; other pages retain their branding.
4. Community vertical offset: reduce reference section top padding by 12px, increase composer height by 14px, and make scenario cards at least 314px high on desktop. Text preview is visually limited to two lines without changing stored copy; the full scenario remains available on its detail page. Mobile resumes full text.
5. Typography: the homepage had 17px controls and 16px body text. Homepage tokens are now 16px controls, 15px body, 13px captions, and a section title maximum of 28px. Core project typography remains Inter as in the supplied archive; other pages are not resized.
6. Reactions: the homepage's unselected reaction uses a heart outline instead of a thumb-up fallback, while preserving admin-uploaded icons, the underlying `like` reaction type, permission checks, the existing API, and all other page components.
7. CTA/footer handoff: compacted event section bottom gap and footer top padding; retained the configured optional payment methods and legal notices.

## Changed source files

- `resources/css/pm-design-tokens.css` — centralized homepage font and brand sizing tokens.
- `resources/css/pm-home-v2-layout.css` — brand ring and header typography.
- `resources/css/pm-home-v2-sections.css` — community/footer layout, CTA spacing and scoped reaction presentation.
- `resources/css/pm-home-v2-responsive.css` — allow full scenario content on mobile.
- `resources/js/components/home/v2/HomeCommunity.tsx` — official PM monogram, existing live scenario text remains dynamic.
- `resources/js/components/home/v2/HomeFooter.tsx` — five-column fallback and homepage social order.
- `resources/js/components/exam/PmpPublicFooter.tsx` — optional reusable social display order; default behavior unchanged.
- `resources/js/components/home/HomeEngagement.tsx` — optional homepage fallback icon, with custom icon priority unchanged.
- `resources/js/components/community/PostEngagementActions.tsx` — pass optional visual-only flag.
- `resources/js/components/community/PostCardV2.tsx` and `resources/js/components/home/v2/PreviewEngagementActions.tsx` — enable homepage-only visual style.
- `tests/Regression/publicHomeScreenshotParity.test.mjs` — three new regression checks.
- `PM_Circle_UI_Style_Guide (4)(8).html` — restored exact approved source guide already present in `docs/`, enabling its existing regression test.

## Verified

- Node regression suite (from project root): **166 passed / 166 total**.
- TypeScript/TSX syntax transpilation: **7 / 7 changed component files passed**.
- `tinycss2` stylesheet top-level parsing: **4 / 4 files passed**.
- No new database migration or queries and no subscription/auth/moderation changes.

## Not verified

- Full `npm run types:check` and `npm run build`: this workspace does not have a complete compatible frontend dependency installation. A temporary reuse of an unrelated incomplete `node_modules` tree produced missing dependency type definitions; that is not a code-build verification.
- Browser pixel-perfect comparison: local Chromium process timed out, and the preview URL could not be inspected. This is a targeted source/UI correction based on the screenshots, **not a claim of certified exact pixels**.
- Live backend interactions: cannot be exercised without the project's database/configuration and deployed app.

## Deployment and precautions

Run in a development/staging checkout with Node 24 LTS, PHP 8.4, valid `.env`, installed Composer dependencies and writable Laravel runtime directories:

```sh
npm ci
php artisan wayfinder:generate --skip-database --with-form
npm run types:check
npm run build
php artisan optimize:clear
```

Do not replace production assets before the build finishes. Compare actual rendering at the *same viewport size, browser zoom, font loading state and scroll position* as the prototype. Backend-dependent post text, reaction totals, footer configuration and payment methods will differ from example screenshots by design. This archive excludes stale `public/build` output to prevent accidentally serving an older frontend.
