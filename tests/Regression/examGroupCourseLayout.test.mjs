import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { memberSidebarGroups, memberSidebarActive } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Exam Simulator parent is premium and only the two approved children remain', () => {
    const group = memberSidebarGroups[0].items.find(item => item.id === 'exams');
    assert.equal(group.premium, true);
    assert.deepEqual(group.children.map(({id, href, premium}) => [id, href, premium]), [['pmp','/exams/pmp',true],['scrum','/exams/scrum',true]]);
    assert.equal(memberSidebarActive('/exams/scrum'), 'scrum');
    assert.match(read('resources/js/components/dashboard/DashboardSidebar.tsx'), /if \(!access\?\.examSimulator\) return renderItem/);
});

test('member simulator routes use the same server plan rule and public Scrum link redirects members', () => {
    const access = read('app/Domain/Billing/Queries/MemberFeatureAccess.php');
    assert.match(access, /function allowsExamSimulator[\s\S]*?return self::allows\(\$plan, 'plus'\)/);
    assert.match(access, /'examSimulator' => self::allowsExamSimulator\(\$plan\)/);
    for (const name of ['PmpExamController','PmpAiUsageController','PmpQuestionChatController','ScrumSimulatorController']) {
        assert.match(read(`app/Http/Controllers/Exam/${name}.php`), /MemberFeatureAccess::allowsExamSimulator/);
    }
    assert.match(read('routes/web.php'), /Route::get\('\/exams\/scrum',/);
    assert.match(read('app/Http/Controllers/Exam/ScrumSimulatorController.php'), /to_route\('exams.scrum.index'\)/);
});

test('authenticated guide-layout pages retain the same shared button and field scope', () => {
    assert.match(read('resources/js/layouts/pm/PublicLayout.tsx'), /pm-member-public-content\$\{guideLayout \? ' pm-guide-public-shell'/);
    const css = read('resources/css/pm-learning-public.css');
    assert.match(css, /\.pm-learn-v3-sidebar \{ display: grid; grid-template-columns: minmax\(0,1fr\)/);
    assert.match(css, /container: learning-catalog \/ inline-size/);
    assert.match(css, /@container learning-catalog \(max-width: 43\.75rem\)/);
    assert.doesNotMatch(css, /\.pm-learn-v3-detail-link \{[^}]*min-height/);
});
