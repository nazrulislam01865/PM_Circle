import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { visibleHelpGuides, searchHelpGuides } from '../../resources/js/components/account/helpGuides.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('legacy imports are explicitly disabled until source configuration changes', () => {
    assert.match(read('config/pm-circle.php'), /'profile_resume_imports_visible' => false,/);
    assert.match(read('app/Http/Middleware/HandleInertiaRequests.php'), /'profileResumeImportsVisible' => \(bool\) config\('pm-circle.profile_resume_imports_visible', false\)/);
});
test('direct imports page redirects before loading its records', () => {
    const controller = read('app/Http/Controllers/Settings/ProfileController.php');
    const guard = controller.indexOf("if ($activeTab === 'imports' && ! config('pm-circle.profile_resume_imports_visible', false))");
    assert.ok(guard >= 0 && guard < controller.indexOf('$user->loadMissing'));
    assert.match(controller.slice(guard, guard + 250), /redirect\(\)->route\('profile.edit', \['tab' => 'overview'\]\)/);
});
test('shared navigation and shortcuts respect the same switch', () => {
    assert.match(read('resources/js/components/profile/ProfileWorkspaceHeader.tsx'), /item.id !== 'imports' \|\| profileResumeImportsVisible === true/);
    const page = read('resources/js/pages/settings/profile.tsx');
    assert.match(page, /profileResumeImportsVisible && currentTab === 'imports'/);
    assert.match(page, /onImport=\{profileResumeImportsVisible \?/);
    assert.match(page, /profileResumeImportsVisible && <div className="grid grid-cols-2 gap-2">/);
    assert.match(read('resources/js/components/profile/ProfileEditorPrototype.tsx'), /\{onImport && <section className="pm-card pm-prototype-section pm-prototype-simple">/);
    for (const path of ['pages/account/ResumeAssistant.tsx', 'components/profile/ResumeAiReview.tsx']) {
        assert.match(read('resources/js/'+path), /profileResumeImportsVisible && (?:!draftOnly && )?<Link[^>]+tab=imports/);
    }
});
test('help guide is hidden by default and restored with the switch', () => {
    const has = groups => groups.some(group => group.id === 'ai' && group.articles.some(article => article.id === '1'));
    assert.equal(has(visibleHelpGuides()), false);
    assert.equal(has(visibleHelpGuides(true)), true);
    assert.equal(has(searchHelpGuides('Import your CV')), false);
    assert.equal(has(searchHelpGuides('Import your CV', true)), true);
});
