import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('member notification APIs and private broadcast channels are owner scoped', () => {
    const api = read('app/Http/Controllers/Account/NotificationController.php');
    const channels = read('routes/channels.php');
    const routes = read('routes/web.php');
    assert.match(api, /where\('notifiable_id', \$request->user\(\)->id\)/);
    assert.match(api, /whereNull\('read_at'\)/);
    assert.match(routes, /\['auth', 'pm\.member', 'verified', 'pm\.onboarded', 'throttle:60,1'\]/);
    assert.match(channels, /\(string\) \$user->id === \$userId/);
});

test('source persists before WebSocket delivery and isolates independent transports', () => {
    const service = read('app/Domain/Notifications/ActivityNotifier.php');
    const job = read('app/Jobs/BroadcastNotificationUpdate.php');
    assert.match(service, /insertOrIgnore\(/);
    assert.match(service, /BroadcastNotificationUpdate::dispatch\(\$recipientId\)/);
    assert.match(job, /\['pusher', 'reverb'\]/);
    assert.match(job, /PrivateChannel\('users\.'/);
    assert.match(job, /catch \(Throwable \$exception\)/);
});

test('notification bell and full page reuse same client state and markup', () => {
    const bell = read('resources/js/components/notifications/NotificationBell.tsx');
    const page = read('resources/js/pages/account/Notifications.tsx');
    const provider = read('resources/js/components/notifications/NotificationCenter.tsx');
    assert.match(bell, /<NotificationList compact/);
    assert.match(page, /<NotificationList\/>/);
    assert.match(provider, /connect\(PusherClient, 'reverb'\)/);
    assert.match(provider, /window\.setInterval/);
});
