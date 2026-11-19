import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const overview = read('resources/js/components/profile/ProfileOverviewSections.tsx');
const editor = read('resources/js/components/profile/ProfileEditorPrototype.tsx');
const page = read('resources/js/pages/settings/profile.tsx');
const controller = read('app/Http/Controllers/Settings/ProfileController.php');
const css = read('resources/css/pm-profile.css');

test('overview represents every edit profile section and uses the same persisted field schema', () => {
    for (const section of ['Basic details', 'Contact details', 'About & skills', 'Career preferences']) {
        assert.ok(overview.includes(`title="${section}"`), `missing ${section}`);
    }
    for (const key of ['experiences', 'projects', 'educations', 'certifications', 'courses', 'awards',
        'publications', 'volunteering', 'languages', 'links']) {
        assert.match(overview, new RegExp(`key: '${key}'`));
    }
    assert.match(overview, /initialRecords\(profile\)/);
    assert.match(overview, /definition\.fields/);
    assert.match(controller, /'editor_details' => in_array\(\$activeTab, \['edit', 'overview'\], true\)/);
    assert.match(page, /<ProfileOverviewSections profile=\{profileData\}/);
    assert.match(overview, /No \{definition\.title\.toLowerCase\(\)\} added yet/);
});

test('owner contact details stay in the authenticated overview and external URLs are safe', () => {
    assert.match(overview, /Only you can see these contact details on this page/);
    assert.match(overview, /rel="noopener noreferrer"/);
    assert.match(overview, /\^https\?:\\\/\\\//);
    assert.match(overview, /originalProjects=\{profile\.projects\}/);
});

test('edit sidebar follows page scrolling and preserves the shared sticky offset', () => {
    assert.match(editor, /window\.addEventListener\('scroll', scheduleUpdate, \{ passive: true \}\)/);
    assert.match(editor, /window\.requestAnimationFrame\(updateActiveSection\)/);
    assert.match(editor, /getComputedStyle\(first\)\.scrollMarginTop/);
    assert.match(editor, /aria-current=\{active === item\.id \? 'location'/);
    assert.match(editor, /window\.removeEventListener\('scroll', scheduleUpdate\)/);
});

test('new overview styles remain scoped and use design tokens', () => {
    assert.match(css, /\.pm-profile-page \.pm-overview-field-grid/);
    assert.match(css, /@media \(max-width: 42rem\)/);
    assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.doesNotMatch(css.slice(css.indexOf('/* Read-only owner overview:')), /#[0-9a-f]{3,8}\b/i);
});
