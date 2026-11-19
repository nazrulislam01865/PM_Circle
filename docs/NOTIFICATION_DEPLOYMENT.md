# PM Circle member notifications — deployment

This module is **database-first**. Laravel writes one recipient-scoped notification per social event; the default queue publishes an invalidation to **both** configured transports. The browser connects to hosted Pusher Channels first, switches to self-hosted Reverb after an unavailable/failed connection (or a 10-second failed initial connection), and periodically reconciles the database feed. A failed realtime connection must not remove saved notifications.

## Dependencies and lockfiles

The uploaded source does not include `vendor` / `node_modules`; the inspection environment cannot reach Composer or npm registries. `composer.json` adds `laravel/reverb` and `pusher/pusher-php-server`; `package.json` adds `pusher-js`. Before deployment, run **on a development machine with network access**:

```sh
composer update laravel/reverb pusher/pusher-php-server --with-all-dependencies
npm install --package-lock-only
composer install --no-dev --optimize-autoloader
npm ci
npm run types:check
npm run build
php artisan test --filter=MemberNotificationTest
```

Commit both regenerated `composer.lock` and `package-lock.json` alongside these source changes. Avoid running dependency resolution or overwriting `.env` on the live server. Don't deploy until all tests/builds pass.

## Environment

Set the following in the server's existing `.env`, with real values and **never include secrets in frontend files**:

```dotenv
# Leave BROADCAST_CONNECTION at its existing app value; notification fan-out uses named transports.
QUEUE_CONNECTION=redis
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=mt1

REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_ALLOWED_ORIGINS=your-domain.example
REVERB_PUBLIC_HOST=your-domain.example
REVERB_PUBLIC_PORT=443
REVERB_PUBLIC_SECURE=true
```

`PUSHER_APP_KEY` and `REVERB_APP_KEY` are public WebSocket application keys. `PUSHER_APP_SECRET` / `REVERB_APP_SECRET` remain server-side. Configure Pusher Channels credentials only if you actually use the hosted service; Reverb can operate independently.

## Server

- Use the existing Redis/default queue workers for `BroadcastNotificationUpdate`; the job only sends a small `notifications.updated` event, not notification content.
- Start `php8.4 artisan reverb:start --host=127.0.0.1 --port=8080` under Supervisor (a **new** process, not an AI worker).
- Proxy `/app` and `/apps` from an HTTPS Nginx hostname to `http://127.0.0.1:8080`, with HTTP/1.1 and `Upgrade` / `Connection` headers for WebSockets. Configure Nginx using your existing managed certificate and server block; never expose port 8080 publicly.
- Back up database and files, run `php8.4 artisan migrate --force`, `php8.4 artisan optimize:clear`, `php8.4 artisan queue:restart`, and `php8.4 artisan reverb:restart` after rollout. Do not reset production data.
- Verify `php8.4 artisan channel:list`, `php8.4 artisan route:list --path=notifications`, and browser network connections to the right WSS endpoint. Test hosted Pusher disabled: Reverb should still update the badge. Test both disabled: notification list should still refresh from the database when focused or polled.

## Security and behavior

- Feed/read endpoints require authenticated, verified, onboarded **members** and scope every query by the authenticated ID; private channel auth uses the same ownership comparison.
- Only newly created follows/reactions, visible comments (after AI or human approval), and challenge replies/reactions generate notifications. Repeated requests are idempotent. Muted posts suppress reaction/comment alerts. No public message body is pushed over WebSockets.
- Existing notifications are not automatically populated retroactively. There is no migration/backfill of old social activity.
