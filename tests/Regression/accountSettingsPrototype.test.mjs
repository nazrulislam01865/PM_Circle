import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const config = read('config/account_settings.php');
const sections = JSON.parse(config.split("<<<'JSON'\n")[1].split('\nJSON\n')[0]);
const fields = sections.flatMap(section => section[3].flatMap(group => group[1]));
const byId = Object.fromEntries(fields.map(field => [field.id, field]));
test('all nine prototype settings sections have unique row IDs and an explicit implementation mode', () => {
    assert.deepEqual(sections.map(section => section[0]), ['Account','Security','Privacy','Notifications','Learning & practice','Community','AI & usage','Plan & billing','Data & account']);
    assert.equal(new Set(fields.map(field => field.id)).size, fields.length);
    assert.ok(fields.every(field => field.mode && field.help));
    assert.equal(byId.renew.mode, 'unavailable');
    assert.equal(byId.mfa.href, '/settings/security');
    assert.deepEqual(sections[2][3], []); // rendered by the shared profile editor, not duplicate rows
    assert.equal(byId.inapp.mode, 'preference');
    assert.equal(byId.anon.mode, 'preference');
});
test('settings use the existing member shell, reusable card, sticky horizontal navigation and account-scoped validated patch', () => {
    const page = read('resources/js/pages/settings/account.tsx');
    const css = read('resources/css/pm-account-settings.css');
    assert.match(page, /<MemberDashboardLayout dashboard=\{memberShell\}/);
    assert.match(page, /<SettingsCard/);
    assert.match(page, /<SettingsRow/);
    assert.match(page, /router\.patch\('\/settings\/account', data/);
    assert.match(css, /\.pm-settings-menu\s*\{[^}]*position: sticky[^}]*overflow-x: auto/);
    assert.match(css, /\.pm-settings-save-bar\s*\{[^}]*position: sticky/);
    assert.match(read('app/Http/Controllers/Settings/AccountSettingsController.php'), /\$request->validated\(\)/);
    assert.match(read('app/Http/Controllers/Settings/AccountSettingsController.php'), /lockForUpdate\(\)/);
    assert.match(read('resources/js/components/community/PostComposerDialog.tsx'), /canAnonymous && auth\?\.user\?\.settings\?\.anonymous_by_default/);
    assert.match(read('app/Domain/Notifications/ActivityNotifier.php'), /\$preferences\['inapp'\]/);
});

test('account and My Profile share the same privacy editor and validation contract', () => {
    const page = read('resources/js/pages/settings/account.tsx');
    const component = read('resources/js/components/profile/ProfilePrivacyTab.tsx');
    const controller = read('app/Http/Controllers/Settings/AccountSettingsController.php');
    assert.match(page, /<ProfilePrivacyEditor/);
    assert.match(component, /<ProfilePrivacyEditor/);
    assert.match(controller, /ProfileFieldPrivacy::groups\(\)/);
    assert.match(controller, /ProfileFieldPrivacy::choices\(/);
    assert.match(controller, /\$profile->field_visibility = \$data\['field_visibility'\]/);
    assert.match(read('app/Http/Requests/Settings/AccountSettingsRequest.php'), /ProfileFieldPrivacy::validationRules\(\)/);
    assert.match(read('resources/css/pm-account-settings.css'), /width: 22rem/);
    assert.match(read('resources/js/components/settings/SettingsCard.tsx'), /<output/);
});

test('interview preferences initialize only active catalog options without new queries', () => {
    const controller = read('app/Http/Controllers/Interview/InterviewController.php');
    const page = read('resources/js/pages/interview/Index.tsx');
    assert.match(controller, /'practiceDefaults' => \$practiceDefaults/);
    for (const key of ['industry', 'role', 'level', 'count', 'answerMode']) {
        assert.match(page, new RegExp(`practiceDefaults\\.${key}`));
        assert.doesNotMatch(byId[key].help, /Saved preference only/);
    }
    assert.match(page, /countOptions\.includes\(Number\(practiceDefaults.count\)\)/);
    assert.match(page, /Object\.prototype\.hasOwnProperty\.call\(options, preferred\)/);
});


test('account privacy omits the informational rail and uses the full available width without changing My Profile', () => {
    const page = read('resources/js/pages/settings/account.tsx');
    const component = read('resources/js/components/profile/ProfilePrivacyTab.tsx');
    const css = read('resources/css/pm-profile-privacy.css');
    assert.match(page, /<ProfilePrivacyEditor showSidebar=\{false\}/);
    assert.match(component, /showSidebar = true/);
    assert.match(component, /\{showSidebar && <aside[\s\S]*?<VisibilityExplanation \/>[\s\S]*?<SavedVisibilityPreview[\s\S]*?<\/aside>\}/);
    assert.match(component, /<ProfilePrivacyEditor groups=\{groups\}/);
    assert.match(css, /\.pm-privacy-layout\.pm-privacy-layout--full\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/);
});
