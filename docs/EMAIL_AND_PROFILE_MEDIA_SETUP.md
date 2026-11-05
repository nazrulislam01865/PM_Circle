# PM Circle - Email verification and profile photo delivery

## Deployment configuration (e2a)

The existing registration step sends a random six-digit code **before** the account is created. Codes expire after 15 minutes, have a five-attempt limit and per-address resend throttle, are stored as HMACs in the browser's server-side session, and are bound to the email entered. On successful verification, the same email must be used at account creation. Production never enables the local fixed-code bypass.

Create a sending identity in the e2a dashboard and obtain a server-side key authorized for it. Add **only to the server's `.env`** (never commit credentials):

```dotenv
PM_MAIL_PROVIDER=e2a
E2A_API_KEY=YOUR_PRIVATE_E2A_KEY
E2A_SENDER_EMAIL=your-sender@your-verified-domain.com
PMC_SIGNUP_VERIFICATION_MODE=email
PMC_EMAIL_VERIFICATION_REQUIRED=true
CACHE_STORE=redis
APP_URL=https://your-real-domain.example
APP_ENV=production
APP_DEBUG=false
```

The selected e2a sender must be enabled to send to your actual users, and automatic email approval/holds must be disabled for signup messages. The API response `accepted` means queued by e2a, not delivered; monitor provider delivery failures. A `pending_review` status intentionally fails the OTP request rather than telling a user their message was sent. Set up e2a domain authentication (SPF/DKIM/DMARC) in its dashboard.

No new PHP dependencies or migrations are needed. The application uses the built-in Laravel HTTP client. The single PHP entry point for future transactional messages is `App\Services\Email\EmailService::send($recipient, $mailable, $optionalPlainText)`. Setting `PM_MAIL_PROVIDER=laravel` uses the existing `MAIL_MAILER` configuration instead; for real delivery select `smtp` or another working Laravel mailer. Existing Laravel Notification password-reset emails still use the Laravel default mailer; configure `MAIL_MAILER` separately if you use e2a for signup.

On the server from the project root:

```bash
mkdir -p bootstrap/cache storage/app/public storage/framework/{cache,sessions,views} storage/logs
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
```

Ensure `storage/` and `bootstrap/cache/` are writable by PHP-FPM. Do not run destructive database migrations. Test an actual signup to an inbox outside e2a before public launch. Only a live send verifies connectivity and credentials; automated tests use fakes.

## Profile photos

The `profiles.avatar_path` and `profiles.cover_photo_path` columns continue storing `/storage/profile-avatars/...` and `/storage/profile-covers/...` respectively. The `Profile` model exposes `/profile-media/avatar/...` and `/profile-media/cover/...` **to every read consumer** (dashboard, header, feed, member lists, profile pages, community comments), including old records. This public media route reads from the `public` Laravel disk, so it does not require a `public/storage` symlink. Original disk paths are used to remove/replace files safely.

If previously uploaded files were lost during deployment, they still need restoring from a backup; no application code can reconstruct missing images. Keep `storage/app/public/profile-avatars` and `storage/app/public/profile-covers` persistent across releases, and configure web server read access for PHP to those folders. Do not copy uploaded files into `public/build`.
