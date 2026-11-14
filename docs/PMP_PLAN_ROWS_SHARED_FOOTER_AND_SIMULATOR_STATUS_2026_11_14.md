# PM Circle: plan rows, shared footer, public simulator status pages

## Scope

- Keep public PMP sample questions, exam scoring and paid exam permissions unchanged.
- Pricing administration has a clearly labeled **New feature title** input, **Text / Checkbox** selector and **Add feature** button. Maximum 40 rows. Each feature has four values, one per existing plan.
- Fix the stored-content merge to replace repeatable lists in full. Removed rows no longer come back from default content.
- Use the same admin-controlled PMP-style footer in existing footer locations on public pages, Discover PM, and member learning pages. Other private dashboard/administrator areas do not gain a new footer.
- Footer data shares a 5-minute cache with the PMP public page; successful administrator saves invalidate it immediately. No migration or additional table is required.
- Public **/simulators/project** and **/simulators/scrum** show the existing coming-soon page. Navigation now targets these URLs instead of member-only placeholder routes, avoiding 403 for administrator or guest sessions. Member-only `/dashboard/features/...` and paid PMP exam routes are NOT unprotected.

## Local verification

```bash
php artisan config:clear
php tests/Regression/PublicPmpPrototypeStaticCheck.php
php tests/Regression/SharedHeaderPrototypeStaticCheck.php
APP_ENV=testing php artisan test --filter=PmpPublicPageAdministrationTest
APP_ENV=testing php artisan test --filter=PublicPmpExamPageTest
npm run types:check
npm run build
```

Manual checks: add text row, add checkbox row, save, reload, remove row, save/reload; check four plan columns; edit footer title and verify public pages / learning use same value; open both public simulator information pages from administrator and guest sessions; confirm paid PMP endpoints stay protected.

## Production

Back up content before rollout. No migration is needed. Deploy files and rebuild assets. Restart PHP long-lived workers if configured and run `php artisan optimize:clear`; admin updates clear the cached content automatically. Do not remove membership middleware from protected routes.
