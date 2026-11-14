# Public PMP Exam Simulator - implementation notes (14 November 2026)

## Scope

Implemented only the public PMP marketing/preview page, following the supplied five screenshots and approved typography/spacing/color guide. The global shared header remains in place; its right-side "PM News" label is now "Trends" on both desktop and mobile. All other public/member layouts and admin UI remain unchanged.

Page: **GET /exam-simulator/pmp** (`exams.pmp.public`), public without login.

The original protected PMP workspace remains **GET /exams/pmp** (`exams.pmp.index`) without any path or name change. Existing POST /exams/pmp/start, attempts, answer, submit, review, and result endpoints retain the original authentication, membership, ownership, and scoring rules. The member dashboard PMP sidebar entry and existing exam links remain unchanged.

## Component reuse

- `resources/js/pages/exam/Public.tsx`: static Inertia page using `PublicLayout siteLayout`, no API calls.
- `resources/js/components/exam/PmpPublicSections.tsx`: reusable card and page sections. The sample is a deterministic 90-second client-side question with answer feedback; its AI explanation is only illustrative.
- `resources/js/components/exam/PmpPublicFooter.tsx`: reference-matched footer variant of existing `SiteFooter`. It does not alter other page footers.
- `resources/css/pm-pmp-public.css`: page-scoped CSS referencing canonical PM Circle typography, spacing, colors and control tokens. Four/two/one-column responsive layouts and horizontally scrolling plan comparison.
- `public/images/exam/public/`: optimized WebP crops from the user-provided mockup screenshots; no external fetches.

## Availability and content boundaries

- The free sample, illustrative plan prices and FAQs are client-side/static. No plan purchase or subscription is created from these buttons; member signup and membership navigation are existing routes.
- Prices and "3,000+" copy follow the supplied prototype, **not a verified live question bank or approved paid simulator catalog**. Pricing is explicitly labeled illustrative. Verify commercial terms before launching as a sales offer.
- No actual testimonial video, production customer quote, verified social account links, or newsletter endpoint was supplied. The video image and testimonials remain labeled as previews/placeholder examples, and missing newsletter functionality is deliberately disabled (not falsely implemented).
- No new migrations, queues, controllers, API integrations, or SQL queries were introduced for this page.

## Test commands

```sh
php -l routes/web.php
php tests/Regression/PublicPmpPrototypeStaticCheck.php
php tests/Regression/SharedHeaderPrototypeStaticCheck.php
php artisan config:clear
APP_ENV=testing php artisan test --filter=PublicPmpExamPageTest
APP_ENV=testing php artisan test --filter=PmpExamSimulatorTest
APP_ENV=testing php artisan test --filter=AdminMemberSeparationTest
npm ci
npm run types:check
npm run build
```

Frontend scripts require Node.js 22.18+ (or another version supported by installed `vite-plus`). Build the frontend before opening the page. Existing compiled `public/build` files from the source archive do not contain these new changes. Never deploy without a successful `npm run build`.

## Deployment / rollback

1. Merge the changed files and images in a staging branch; install/update dependencies with compatible Node.js, then build.
2. Clear Laravel route/config caches and verify `php artisan route:list --path=exams/pmp`; do not migrate the database.
3. Confirm guest, free and paid/member access: public page is visible to everyone; `/exams/pmp` and exam mutation endpoints remain restricted to eligible members.
4. Confirm navigation, anchors, sample feedback, plan table scrolling, FAQ, carousel, footer and mobile layout in a real browser.
5. To roll back, restore the original `routes/web.php`, previous dashboard entry, and previous assets/components. No schema change or data rollback is needed.

## Verification in delivery environment

- PHP syntax, standalone PHP regression checks, TSX transpile syntax and PostCSS parsing: passed.
- Full Laravel suite and full Vite build: not verified here; the attached archive lacked `vendor`/`node_modules`, and npm dependency installation timed out. Run both on your development/staging environment before release.
