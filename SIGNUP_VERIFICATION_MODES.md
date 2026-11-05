# Signup email verification modes (development only)

Add **one** of the following values to your existing local `.env`:

```dotenv
# Normal email verification (default, requires SMTP)
PMC_SIGNUP_VERIFICATION_MODE=email
```

```dotenv
# Local testing: no email sent; click "Get code" to display 123456,
# enter the code, and click "Verify email" before setting a password.
PMC_SIGNUP_VERIFICATION_MODE=fixed
```

```dotenv
# Local testing: immediately enter email and password; no code.
PMC_SIGNUP_VERIFICATION_MODE=off
PMC_EMAIL_VERIFICATION_REQUIRED=false
```

`fixed` and `off` work **only** when `APP_ENV=local` or `APP_ENV=testing`.
In all other environments, including `production` and `staging`, the application
always enforces normal email-code verification even if the setting is misconfigured.
The fixed code is not sent in email and is never exposed in production.

The `fixed` mode still creates a per-session, per-address verification challenge
with the existing expiry, resend cooldown and attempt limits. The code is only
returned from the send-code endpoint in local/test mode. In `off` mode, registration
does **not** set `email_verified_at` (no proof of email ownership). Do not use
local/test data as production membership data.

The legacy `PMC_SIGNUP_EMAIL_CODE_REQUIRED` key continues to work when
`PMC_SIGNUP_VERIFICATION_MODE` is absent. Prefer the new explicit mode.

No SMTP credentials are needed for local `fixed` or `off` mode. `email` mode uses
the existing Laravel Mail configuration.

After editing `.env`, run:

```bash
php artisan config:clear
php artisan route:clear
npm ci
npm run types:check
npm run build
php artisan test --filter=SignupVerificationModesTest
php artisan test --filter=SignupEmailCodeTest
php artisan serve
```

Hard-refresh `/register` after the frontend build. No migrations are needed.
