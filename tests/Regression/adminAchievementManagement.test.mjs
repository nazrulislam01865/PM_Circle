import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
test('badge administration uses real records and admin-only routes', () => {
  const routes = read('routes/web.php');
  assert.match(routes, /Route::middleware\(\['auth', 'pm.admin', 'verified'\]\)->prefix\('admin'\)/);
  assert.match(routes, /AchievementBadgeController::class/);
  assert.match(read('database/migrations/2026_11_27_000005_create_achievement_management.php'), /unique\(\['user_id', 'badge_id'\]\)/);
  assert.match(read('app/Domain/Achievements/Services/AwardLedger.php'), /insertOrIgnore/);
  assert.match(read('app/Http/Controllers/Admin/AchievementBadgeController.php'), /Choose a supported completion source/);
});
test('prototype sections share existing artwork, dropdowns, and portal layer', () => {
  const page=read('resources/js/pages/admin/AchievementBadges.tsx');
  const editor=read('resources/js/components/admin/achievements/BadgeEditor.tsx');
  const controls=read('resources/js/components/admin/achievements/Controls.tsx');
  for(const text of ['Quick create','Badge library','Task & event rewards','Award records','Member preview']) assert.ok(page.includes(text));
  for(const text of ['Badge details','How members earn it','Badge design','Live member preview','Publish settings']) assert.ok(editor.includes(text));
  assert.match(controls, /PMDropdown/); assert.match(controls, /BadgeMedal/); assert.match(controls, /DialogContent/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|Math\.random\(/);
});
test('direct rewards are member-scoped and only query configured source types', () => {
  const src=read('app/Domain/Achievements/Services/SpecificWorkProgress.php');
  assert.match(src, /\$courses !== \[\]/); assert.match(src, /\$lessons !== \[\]/); assert.match(src, /\$challenges !== \[\]/);
  assert.match(src, /where\('user_id', \$user->id\)/); assert.match(src, /where\('r.user_id', \$user->id\)/);
  assert.doesNotMatch(src, /community_event_registrations/);
});

test('all achievement admin views inherit the shared full-width workspace and heading typography', () => {
  const css=read('resources/css/pm-achievement-admin.css');
  const shared=read('resources/css/pm-admin.css');
  const page=read('resources/js/pages/admin/AchievementBadges.tsx');
  assert.match(shared, /\.pm-admin-content\{width:100%;max-width:none/);
  assert.doesNotMatch(css, /\.pm-admin-content:has\(>\.pm-badge-admin\)\s*\{/);
  assert.doesNotMatch(css, /\.pm-admin-page-heading\s+(?:h1|p)\s*\{/);
  assert.match(page, /<AdminLayout title=\{title\}/);
  assert.match(css, /container-type:inline-size/);
  assert.match(css, /@container \(max-width:48rem\)/);
});

test('activity preview and editor reuse one card and preview cards are direct grid children', () => {
  const page=read('resources/js/pages/admin/AchievementBadges.tsx');
  const editor=read('resources/js/components/admin/achievements/BadgeEditor.tsx');
  const controls=read('resources/js/components/admin/achievements/Controls.tsx');
  const css=read('resources/css/pm-achievement-admin.css');
  const preview=page.slice(page.indexOf('function Preview('),page.indexOf('export default function AchievementBadges'));
  assert.match(controls, /export function BadgePreviewCard/);
  assert.match(editor, /<BadgePreviewCard badge=\{preview\} showDescription\/>/);
  assert.match(preview, /className="pm-badge-preview-grid"[^>]*>\{related\.map\(b=><BadgePreviewCard/);
  assert.doesNotMatch(preview, /className="pm-badge-live"|router\.|fetch\(/);
  assert.match(css, /\.pm-badge-preview-grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(min\(100%,15rem\),1fr\)\)/);
  assert.match(preview, /No active rewards for this activity/);
});
