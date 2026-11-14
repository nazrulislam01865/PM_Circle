# PM Circle — Contact page and shared footer

## Scope
- Public `/contact` page follows the supplied two-column prototype, with a reusable form, Email support card, Live chat offline information panel and compact contact footer.
- The existing `SiteFooter` wrapper now renders the same reusable footer component in a dark marketing variant across other existing public/learning footers. The contact page selects its compact light variant, matching the contact mockups.
- The shared header's Help Center and Contact Us entries now lead to their existing public routes. Existing PMP page/admin footer data still supplies the shared footer's labels, links, social profiles and newsletter label.
- `/refund-policy` is an explicit *unpublished-policy notice*, not a legal refund policy. No invented refund terms are introduced.

## Configuration
Set a **real, verified** support mailbox in the project's local `.env` (never inside source):

```dotenv
PMC_SUPPORT_EMAIL=your-verified-support-mailbox@example.com
```

Then run `php artisan config:clear` (and `php artisan config:cache` if you cache config in deployment). The form is disabled if this address is not configured. This avoids sending to the mockup's example `support@pmcircle.com`, which is **not verified** as an official PM Circle address.

Mail delivery uses the existing `EmailService` and whichever provider PM Circle already uses (`PM_MAIL_PROVIDER=e2a` with configured credentials, or the configured Laravel SMTP mailer). A `log`/`array` mailer outside tests is **not** considered actual email delivery.

## Message delivery and privacy
1. Browser submits validated name/email/topic/subject/message, a checkbox and hidden honeypot to `POST /contact` (throttled).
2. Laravel stores the pending message in the configured cache for **10 minutes** and emails the sender a signed confirmation link.
3. The visitor follows the signed URL. A cache lock protects one-time processing.
4. Only after verification does Laravel forward the message to the configured support mailbox. The pending cache entry is removed upon successful send.

No contact-messages database table, admin inbox, polling, or public API is added. If email transport fails, show a friendly error instead of reporting success. Avoid logging submitted PII. A checkbox alone is **not CAPTCHA**; server-side throttle and a hidden honeypot add basic abuse resistance. A third-party CAPTCHA would require separate approval and configuration.

## Prototype dependencies not invented
- Live agent messaging is not implemented in the supplied project. The chat launcher displays an accurate offline/help panel and links visitors to the actual contact form. It never falsely reports an agent online.
- Newsletter signup is not wired to a subscription system and remains disabled rather than pretending to subscribe.
- Social links must be replaced in the existing PMP footer admin controls with **official PM Circle URLs** before promotion; provided generic platform URLs are not official profiles.
- The footer presents payment **brands only**, without checkout endpoints.

## Files
- `routes/web.php`: contact submit/confirmation routes and unpublished refund notice.
- `app/Http/Controllers/PublicSite/ContactController.php`: validation, throttling, confirmation, forwarding.
- `app/Mail/ContactConfirmationLink.php`, `ContactSupportMessage.php` and corresponding `resources/views/mail/` templates.
- `config/contact.php`: recipient and confirmation expiry.
- `resources/js/pages/public/Support.tsx`, `PolicyNotice.tsx`: public pages.
- `resources/js/components/contact/ContactForm.tsx`, `ContactChat.tsx`: reusable UI.
- `resources/js/components/exam/PmpPublicFooter.tsx`, `resources/js/components/pm/SiteFooter.tsx`: reusable footers.
- `resources/js/layouts/pm/PublicLayout.tsx`: optional footer variant.
- `resources/js/components/dashboard/MemberHomeHeader.tsx`: active contact/help links.
- `app/Http/Middleware/HandleInertiaRequests.php`: avoid member-shell projections on support pages.
- `resources/css/pm-contact.css`, `pm-design-tokens.css`, `app.css`: styles and central tokens.
- `tests/Regression/ContactPageAndFooterStaticCheck.php`, `tests/Feature/PublicContactTest.php`: checks.

## Verification and commands
Verified: PHP lint for new backend files; TypeScript/TSX syntax parse; CSS parse; source regression check; archive structure/integrity.

Not verified here: Laravel feature tests (source archive excludes `vendor`/test bootstrap), Vite build/browser pixel comparison. The offline npm install also failed because `yuku-parser` is not cached, and Node 22.16 is below the toolchain's Node 22.18 minimum.

Local verification:

```bash
php artisan optimize:clear
npm ci
npm run types:check
npm run build
php tests/Regression/ContactPageAndFooterStaticCheck.php
APP_ENV=testing php artisan test --filter=PublicContactTest
```

Test guest form validation; email confirmation and duplicate link; mobile layouts at 390px/768px and desktop at 1440px; footer links; offline chat button. No database migration is required.
