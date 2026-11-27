import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('moderation admission and mandatory safety probes resolve the workspace operation route', () => {
    const routing = read('app/Domain/AI/Services/AiFeatureRouting.php');
    assert.match(routing, /primarySecret\('feed_moderation', 'post_check_api_key'\)/);
    assert.match(routing, /primary_credential_id !== null/);
    assert.match(read('app/Domain/Community/Services/PostCheckPolicy.php'), /configured\('feed_moderation', 'post_check_api_key'\)/);
    assert.match(read('app/Domain/DailyChallenge/Services/DailyChallengeModerationProbe.php'), /moderationSecret\(\)/);
    assert.match(read('app/Domain/AI/Providers/OpenAiResponsesProvider.php'), /moderationSecret\(\)/);
});

test('PMP follow-up diagnostics use their own saved operation and settings record', () => {
    assert.match(read('resources/js/components/admin/ai/SettingsShared.tsx'), /followup \? 'pmp-followup' : feature/);
    assert.match(read('app/Domain/AI/Services/FeatureConnectionStatus.php'), /'pmp-followup' => 'pmp_followup'/);
    assert.match(read('app/Http/Controllers/Admin/AI/FeatureSettingsController.php'), /'pmp-followup' => DB::table\('ai_features'\)->where\('code', 'pmp_followup'\)/);
});

test('both badge rails consume one capped newest-award projection', () => {
    assert.match(read('app/Domain/Achievements/Services/AwardLedger.php'), /\$award->earned_at \?\? \$award->created_at/);
    const projection = read('app/Domain/Achievements/Queries/MemberAchievements.php');
    assert.match(projection, /awardOrderId/);
    assert.match(projection, /'latest' => array_slice\(\$latest, 0, 3\)/);
    assert.match(read('app/Domain/Dashboard/Queries/MemberDashboardStats.php'), /'badges' => \$achievement\['latest'\]/);
    assert.match(read('app/Http/Controllers/Settings/ProfileController.php'), /'latest_badges' => \$stats\['overview'\]\['badges'\]/);
});

test('reviewed resume submit explicitly synchronizes shared profile records, not drafts or verification flags', () => {
    assert.match(read('resources/js/pages/account/ResumeAssistant.tsx'), /sync_profile:action==='submit'/);
    assert.match(read('app/Domain/Identity/Services/ResumeAssistantProfile.php'), /if \(\$input\['sync_profile'\] \?\? false\) app\(ResumeProfileSync::class\)->apply/);
    const sync = read('app/Domain/Identity/Services/ResumeProfileSync.php');
    assert.match(sync, /\$key === 'certifications' && \$row\?->verified\) continue/);
    assert.match(sync, /if \(\$new \|\| \$row->isDirty\(\)\) \$row->save\(\)/);
    assert.doesNotMatch(sync, /->delete\(/);
});
