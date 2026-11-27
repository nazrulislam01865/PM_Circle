import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const config = read('config/account_settings.php');
const sections = JSON.parse(config.split("<<<'JSON'\n")[1].split('\nJSON\n')[0]);
const fields = Object.fromEntries(sections.slice(0,4).flatMap(s => s[3].flatMap(g => g[1])).map(f => [f.id,f]));

test('account settings use shared dropdowns and save privacy changes only', () => {
    const page = read('resources/js/pages/settings/account.tsx');
    assert.match(page, /data\.field_visibility_patch = Object\.fromEntries\(privacyPatch\.map/);
    assert.match(page, /<ProfilePrivacyEditor showSidebar=\{false\} centralized/);
    assert.match(read('resources/js/components/settings/SettingsCard.tsx'), /<PMDropdown/);
    assert.match(read('resources/js/components/profile/ProfilePrivacyTab.tsx'), /centralized \? <PMDropdown/);
    assert.match(page, /updateAppearance\(mode\)/);
    assert.doesNotMatch(page, /pm-settings-theme-dark/);
    assert.match(read('app/Http/Controllers/Settings/AccountSettingsController.php'), /array_replace\(\$profile->field_visibility \?\? \[\], \$data\['field_visibility_patch'\]\)/);
    assert.match(read('app/Domain/Identity/Services/ProfileFieldPrivacy.php'), /self::profileAudiences\(\$viewer\)/);
});

test('other session revocation is password protected, scoped to the member and retains current session', () => {
    const controller = read('app/Http/Controllers/Settings/AccountSettingsController.php');
    const routes = read('routes/settings.php');
    assert.match(routes, /revoke-sessions[^\n]*throttle:5,1/);
    assert.match(controller, /current_password:web/);
    assert.match(controller, /logoutOtherDevices/);
    assert.match(controller, /setRememberToken/);
    assert.match(controller, /where\('user_id', \$user->id\)->where\('id', '!=', \$request->session\(\)->getId\(\)\)/);
    assert.match(read('app/Http/Middleware/AuthenticateMemberSession.php'), /! \$request->user\(\)->is_admin/);
});

test('optional email channels and delivery frequencies have real persisted and bounded delivery', () => {
    for (const key of ['mail','digest','learnNotify','examNotify','eventNotify','usageNotify']) assert.equal(fields[key].mode,'preference');
    assert.equal(fields.mail.value,false);
    assert.equal(fields.push.mode,'unavailable');
    const notifier = read('app/Domain/Notifications/ActivityNotifier.php');
    assert.match(notifier, /if \(! \$inApp && \$due === null\) return/);
    assert.match(notifier, /email_verified_at \? ActivityPreferences::emailDue/);
    assert.match(notifier, /if \(\$inserted > 0 && \$inApp\)/);
    const delivery = read('app/Jobs/DeliverActivityEmail.php');
    assert.match(delivery, /limit\(50\)->lockForUpdate\(\)/);
    assert.match(delivery, /ActivityPreferences::allows/);
    assert.match(delivery, /'email_status' => 'claimed'/);
    assert.match(delivery, /'email_status' => 'unknown'/);
    assert.match(read('routes/console.php'), /limit\(200\)/);
    assert.match(read('app/Http/Controllers/Account/NotificationController.php'), /where\('in_app', true\)/);
});

test('opt-in completion alerts reuse verified completion events and do not query for disabled topics', () => {
    assert.match(read('app/Services/Learning/CourseLessonProgress.php'), /\$newCompletion && \(\$user->account_preferences\['learnNotify'\] \?\? false\)/);
    assert.match(read('app/Http/Controllers/Exam/PmpExamController.php'), /DB::afterCommit\(static fn \(\) => app\([^\n]*forPmpCompletion/);
    assert.match(read('app/Http/Controllers/PublicSite/EventPreviewController.php'), /\$inserted && \$member && \(\$request->user\(\)->account_preferences\['eventNotify'\] \?\? false\)/);
    const gateway = read('app/Domain/AI/Services/AiGateway.php');
    assert.match(gateway, /catch \(AiFailure \$failure\)[\s\S]*?forAiLimit[\s\S]*?throw \$failure/);
    const list = read('resources/js/components/notifications/NotificationList.tsx');
    for (const key of ['notification_locale','notification_timezone','notification_clock']) assert.match(list,new RegExp(key));
});
