import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('three AI screens share Career Trends design tokens and admin controls', () => {
    const shared = read('resources/js/components/admin/ai/SettingsShared.tsx');
    assert.match(read('resources/css/app.css'), /@import '\.\/pm-career-trend-settings\.css'/);
    assert.match(shared, /pm-career-settings-panel/);
    for (const page of ['DailyChallenge','PmpAiSettings','FeedModerationAiSettings']) {
        const src = read(`resources/js/pages/admin/${page}.tsx`);
        for (const pattern of [/<AdminLayout/, /<ConnectionPanel/, /<Actions/, /pm-career-settings-grid/, /form.put/]) assert.match(src, pattern);
        assert.doesNotMatch(src, /localStorage|api_key\s*:/);
    }
});
test('PMP settings update only existing tutor enable flags and allowlisted models', () => {
    const controller = read('app/Http/Controllers/Admin/AI/FeatureSettingsController.php');
    const update = controller.slice(controller.indexOf('public function updatePmp'), controller.indexOf('public function feed'));
    assert.match(update, /ai.manage_features/);
    assert.match(update, /lockForUpdate/);
    assert.match(update, /ai_prompt_versions/);
    assert.match(update, /ai_model_prices/);
    assert.doesNotMatch(update, /pmp_exam_settings|pmp_exam_questions|ai_chat_limit_policies|credit_tariff/);
    assert.match(read('resources/js/pages/admin/PmpQuestionBank.tsx'), /AI settings/);
});
test('mandatory moderation is preserved; optional clean-content review applies only to posts', () => {
    const post = read('app/Domain/AI/Jobs/CheckCommunityPost.php');
    const comment = read('app/Domain/AI/Jobs/CheckCommunityComment.php');
    assert.match(post, /! \$result\['violates'\] && ! \$result\['needs_review'\]/);
    assert.match(post, /elseif \(\$result\['needs_review'\] \|\| \$holdClean\)/);
    assert.doesNotMatch(comment, /holdCleanContent|pending_review/);
    for (const src of [post, comment]) {
        assert.match(src, /PostCheckBudget/);
        assert.match(src, /record(?:Comment)?Violation/);
    }
    assert.match(read('database/migrations/2026_11_25_000003_create_feed_moderation_settings.php'), /default\(false\)/);
});
test('connection checks use the feature-specific server keys and never return a key', () => {
    const service = read('app/Domain/AI/Services/FeatureConnectionStatus.php');
    for (const key of ['daily_challenge_api_key','api_key','post_check_api_key']) assert.ok(service.includes(`, '${key}')`));
    assert.match(service, /->primarySecret\(/);
    assert.match(read('app/Domain/AI/Services/AiFeatureRouting.php'), /->selectCredential\(/);
    assert.match(service, /\$credentials->testEnvironment/);
    assert.match(read('app/Domain/AI/Services/AiCredentialDiagnostic.php'), /withoutRedirecting/);
    assert.match(service, /hash_hmac/);
    assert.doesNotMatch(service.slice(service.indexOf('private function base('), service.indexOf('public function test(')), /'key'\s*=>/);
});
test('feature and editorial settings use the existing active verified administrator role', () => {
    const access = read('app/Domain/AI/Services/AiAdminAccess.php');
    const roleGuard = access.indexOf('$actor->is_admin === true');
    const rolePermissions = access.indexOf("['ai.manage_features', 'ai.manage_editorial']");
    const separateGrants = access.indexOf("DB::table('ai_admin_permissions')");
    assert.ok(roleGuard >= 0 && roleGuard < rolePermissions && rolePermissions < separateGrants);
    assert.match(access, /\$actor->status === 'active' && \$actor->email_verified_at !== null/);
    assert.match(access, /in_array\(\$permission, \['ai.manage_features', 'ai.manage_editorial'\], true\)\) \{\s*return;/);
    assert.match(access, /where\('user_id', \$actor->id\)->where\('permission', \$permission\)->exists\(\)/);
    const daily = read('resources/js/pages/admin/DailyChallenge.tsx');
    assert.match(daily, /label="Scenario title guidance"/);
    assert.match(daily, /setData\('generation_title_hint'/);
    assert.doesNotMatch(daily, /label="Title direction"/);
});
