import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('copy confirmation lives beside the Share icon, with semantic success color and fallback', () => {
    const detail = read('resources/js/components/learning/CourseDetail.tsx');
    assert.match(detail, /className="pm-course-share-action"[\s\S]*?<Share2 size=\{19\}[\s\S]*?role="status">\{shareStatus\}<\/span>/);
    assert.doesNotMatch(detail, /<p className="pm-course-detail-share-status"/);
    const css = read('resources/css/pm-learning-course-detail.css');
    assert.match(css, /\.pm-course-share-action \{ display: inline-flex; align-items: center/);
    assert.match(css, /\.pm-course-share-action \.pm-course-detail-share-status \{ color: var\(--green\)/);
    assert.match(css, /\.pm-course-detail-share-status\.is-fallback \{ color: var\(--pm-guide-muted\)/);
});

test('clipboard success expires in 2500 ms, repeated attempts reset it, fallback stays usable', () => {
    const page = read('resources/js/pages/learning/CourseShow.tsx');
    assert.match(page, /await navigator\.clipboard\.writeText\(publicUrl\);[\s\S]*?setShareStatus\('Course link copied\.'\);[\s\S]*?setTimeout\(\(\) => \{\s*setShareStatus\(''\);[\s\S]*?\}, 2500\)/);
    assert.match(page, /const attempt = \+\+shareAttempt.current;\s*if \(shareTimer.current !== null\) clearTimeout/);
    assert.match(page, /return \(\) => \{\s*shareAttempt.current \+= 1;\s*if \(shareTimer.current !== null\) clearTimeout/);
    assert.match(page, /catch \{[\s\S]*?setShareLink\(publicUrl\)/);
});

test('study target and tabs use real layout gap and surrounding margins, not paragraph margin alone', () => {
    const page = read('resources/js/pages/learning/MyLearning.tsx');
    assert.match(page, /pm-my-learning-toolbar[\s\S]*?Weekly study target:[\s\S]*?Filter enrolled courses/);
    const css = read('resources/css/pm-course-workspace.css');
    assert.match(css, /\.pm-my-learning-toolbar \{ display: grid; gap: var\(--s6\); margin-block: var\(--s5\) var\(--s6\);/);
    assert.match(css, /\.pm-my-learning-toolbar \.pm-course-workspace-filters \{ margin: 0; \}/);
});

test('main profile progress does not count optional extras and reports missing fields', () => {
    const source = read('app/Domain/Identity/Services/ProfileCompleteness.php');
    const checks = source.slice(source.indexOf('$checks = ['), source.indexOf("'profile' => intdiv"));
    assert.equal((checks.match(/=>/g) ?? []).length, 13);
    assert.doesNotMatch(checks, /avatar|linkedin|github|portfolio|research|awards|interests/i);
    assert.match(source, /'missing' => array_keys\(array_filter\(\$checks/);
    assert.match(read('app/Http/Controllers/Settings/ProfileController.php'), /'completion_missing' => \$scores\['missing'\]/);
    assert.match(read('resources/js/pages/settings/profile.tsx'), /profileData\.completion_missing\.join\(', '\)/);
});
