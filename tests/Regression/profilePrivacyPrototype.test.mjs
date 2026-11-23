import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const config = read('config/profile_privacy.php');
const css = read('resources/css/pm-profile-privacy.css');
const jsx = read('resources/js/components/profile/ProfilePrivacyTab.tsx');
const page = read('resources/js/pages/settings/profile.tsx');
const appCss = read('resources/css/app.css');
const layout = read('resources/js/layouts/pm/MemberDashboardLayout.tsx');
const request = read('app/Http/Requests/Settings/ProfileUpdateRequest.php');
const controller = read('app/Http/Controllers/Settings/ProfileController.php');
const migration = read('database/migrations/2026_11_18_000004_add_profile_field_visibility.php');
const directories = read('app/Http/Controllers/Members/MemberDirectoryController.php');
const homepage = read('app/Http/Controllers/PublicSite/HomeController.php');

test('the four prototype groups and all 31 labels are preserved exactly', () => {
  const groups = [...config.matchAll(/'title' => '([^']+)'/g)].map((x) => x[1]);
  assert.deepEqual(groups, ['Basic details', 'About & skills', 'Professional sections', 'Career preferences']);
  const labels = [...config.matchAll(/\['key' => '([^']+)', 'label' => '([^']+)'\]/g)].map((x) => x[2]);
  assert.equal(labels.length, 31);
  assert.deepEqual(labels.slice(0, 4), ['Full name','Professional headline','Current job title','Current organisation']);
  assert.ok(labels.includes('Certifications & licences'));
  assert.equal(labels.at(-1), 'Open to relocation');
});
test('privacy stays inside the existing profile page, member header and footer', () => {
  assert.match(page, /<ProfilePrivacyTab/);
  assert.match(page, /<MemberDashboardLayout/);
  assert.match(layout, /<MemberCompactHeader/);
  assert.match(layout, /<SiteFooter/);
  assert.match(page, /'Manage your professional profile and who can see it\.'/);
  assert.match(page, /Resume & imports/);
});
test('design controls exclusively reuse approved guide tokens', () => {
  for (const value of ['--s3','--s4','--s5','--border','--radius-control','--radius-card','--control-height','--control-touch','--text-h2','--text-h3','--text-ui','--line-ui','--font-ui','--ink','--muted']) {
    assert.ok(css.includes(`var(${value})`), `missing ${value}`);
  }
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|\bfont-size:\s*\d+(?:px|rem)\b/);
  assert.match(jsx, /className="pm-select pm-privacy-select"/);
  assert.match(jsx, /className="pm-btn pm-btn-primary pm-privacy-save"/);
  assert.match(appCss, /@import '\.\/pm-profile-privacy\.css';/);
});
test('responsive page preserves rows, field labels and accessible controls', () => {
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(jsx, /<fieldset/);
  assert.match(jsx, /htmlFor={`privacy-/);
  assert.match(jsx, /disabled={saving}/);
  assert.match(jsx, /aria-pressed={selected === option.value}/);
});
test('privacy choices save for the authenticated user with server validation', () => {
  assert.match(jsx, /router\.patch\('\/settings\/profile'/);
  assert.match(request, /ProfileFieldPrivacy::keys\(\)/);
  assert.match(request, /Rule::in\(\['public', 'community', 'private'\]\)/);
  assert.match(controller, /'field_visibility'\s*,/);
  assert.match(migration, /\$table->jsonb\('field_visibility'\)/);
  assert.match(directories, /ProfileFieldPrivacy::visible/);
  assert.match(homepage, /ProfileFieldPrivacy::visible/);
  assert.match(controller, /'privacy' => \['profile'\]/);
});
