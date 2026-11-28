import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the live profile editor and overview use the same server-provided progress, never a retained 100 percent', () => {
    const service = read('app/Domain/Identity/Services/ProfileCompleteness.php');
    assert.match(service, /intdiv\(count\(array_filter\(\$checks\)\) \* 100, count\(\$checks\)\)/);
    for (const section of ['profileProjects', 'educations', 'certifications', 'languages']) assert.ok(service.includes(section));
    assert.match(service, /loadExists\(\$missing\)/);
    for (const path of ['resources/js/components/profile/ProfileEditorPrototype.tsx', 'resources/js/components/profile/CompactProfileEditor.tsx']) {
        assert.match(read(path), /const completion = profile\.completeness/);
        assert.doesNotMatch(read(path), /setCompletion/);
    }
    assert.match(read('app/Domain/Dashboard/Queries/MemberShell.php'), /profilePercentage\(\$user\)/);
});

test('Home and My Profile use coverage for their progress and the original core score for rewards', () => {
    for (const path of ['app/Domain/Dashboard/Queries/DashboardOverview.php', 'app/Http/Controllers/Settings/ProfileController.php']) {
        const source = read(path);
        assert.match(source, /\$scores = app\(ProfileCompleteness::class\)->scores\(\$user\)/);
        assert.match(source, /=> \$scores\['profile'\]/);
        assert.match(source, /forMember\(\$user, \$scores\['core'\]\)/);
    }
    assert.match(read('app/Domain/Billing/Services/ProfileCompletionRewardService.php'), /\$this->completeness->percentage\(\$user\)/);
    assert.match(read('app/Domain/Achievements/Queries/MemberAchievements.php'), /ProfileCompleteness::class\)->percentage\(\$user\)/);
});

test('the two Home actions use existing destinations', () => {
    const home = read('resources/js/components/dashboard/MemberHomeOverview.tsx');
    assert.match(home, /href="\/exams\/pmp\/enter" action="View exam simulator"/);
    assert.match(home, /href="\/dashboard\/learning\/my-learning"[^>]*>Continue learning/);
    assert.match(read('routes/web.php'), /Route::get\('\/dashboard\/learning\/my-learning', .*CourseLearningController::class, 'index'\]/);
});
