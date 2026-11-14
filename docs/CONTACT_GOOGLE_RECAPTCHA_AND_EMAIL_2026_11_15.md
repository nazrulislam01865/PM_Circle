# PM Circle: Contact form — reCAPTCHA v2 and existing email service

## What changed

- The mock `Verify you're human` checkbox is replaced with **Google reCAPTCHA v2 Checkbox**. The browser receives only the site key. The secret remains server-side.
- The server verifies each token at Google's `siteverify` endpoint and rejects missing, expired, invalid or other-host responses; external service failures fail closed.
- No new npm or Composer packages, queues, database tables, or queries were added.
- Contact confirmation and support forwarding continue through `App\Services\Email\EmailService`, respecting existing `PM_MAIL_PROVIDER=e2a` or Laravel's mail transport.
- Support messages are delivered *after* the visitor clicks the existing 10-minute signed verification email link. Each confirmation is processed once.
- Support recipient preference: `PMC_SUPPORT_EMAIL`, then `E2A_SENDER_EMAIL`, then `MAIL_FROM_ADDRESS`. The fallback must be a **monitored inbox**; if your sending identity is a no-reply address, explicitly set `PMC_SUPPORT_EMAIL`.

## Required `.env` values (keep real secrets out of source)

```dotenv
# Google reCAPTCHA admin console -> v2 -> "I'm not a robot" checkbox
RECAPTCHA_SITE_KEY=your_google_v2_site_key
RECAPTCHA_SECRET_KEY=your_google_v2_secret_key

# Recommended monitored mailbox to receive verified enquiries
PMC_SUPPORT_EMAIL=support@your-real-domain.example

# Continue using your existing email service settings; e.g. already configured:
# PM_MAIL_PROVIDER=e2a
# E2A_API_KEY=... (secret, do not share)
# E2A_SENDER_EMAIL=... (verified sender)
```

Register your real site domain in Google reCAPTCHA; also register your development host if testing locally. The keys **must be for reCAPTCHA v2 Checkbox**, not v3/invisible. Real keys must be provided by the operator: the project does not contain any. Configure both `RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` on the same deployment.

After changing `.env`, run `php artisan config:clear` (or `php artisan config:cache` on deployment after verifying settings). Never print or share the reCAPTCHA secret key in logs, screenshots, or diagnostic output.

## Expected contact workflow

1. User completes the form and Google reCAPTCHA challenge.
2. Laravel validates text, applies existing IP and email rate limits, verifies reCAPTCHA with Google, and sends a confirmation to the visitor through the existing email service.
3. The visitor confirms within 10 minutes using the signed email link.
4. Laravel forwards the message once to the configured support inbox; no database storage is required.

If Google is unavailable or an email transport is disabled, the server rejects the operation and returns a user-friendly error without claiming the message was delivered. If the email sender does not have an inbox, set `PMC_SUPPORT_EMAIL` to an address that does.

## Tests

```bash
php artisan config:clear
APP_ENV=testing php artisan test --filter=PublicContactTest
php tests/Regression/ContactPageAndFooterStaticCheck.php
npm run types:check
npm run build
```

The test suite fakes Google and mail delivery; it does not prove credentials or real inbox delivery. Test with real keys on a staging domain and a monitored mailbox before production.
