import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eventCalendar } from '../../resources/js/components/events/eventCalendar.ts';
const read = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');
const config = JSON.parse(read('config/account_settings.php').split("<<<'JSON'\n")[1].split('\nJSON\n')[0]);
const fields = Object.fromEntries(config.slice(4).flatMap(page => page[3].flatMap(group => group[1])).map(field => [field.id, field]));

test('settings share the dropdown layout and preserve the far-edge chevron', () => {
    const css = read('resources/css/pm-profile-privacy.css');
    const row = css.match(/\.pm-privacy-field-row \.pm-privacy-select\s*\{([^}]+)\}/)[1];
    assert.doesNotMatch(row, /display:\s*block/);
    assert.match(read('resources/css/pm-dropdown.css'), /\.pm-dropdown-chevron\s*\{[^}]*margin-inline-start:\s*auto/);
    assert.match(read('resources/js/pages/settings/account.tsx'), /<SettingsRow key=\{field.id\} centralized field=/);
    assert.match(read('resources/js/components/profile/ProfilePrivacyTab.tsx'), /showSidebar = true, centralized = true/);
});

test('learning preferences have actual consumers and interview options are validated against master data', () => {
    for (const id of ['goal','interest','examMode','rationales','role','industry','level','answerMode','count']) assert.equal(fields[id].mode, 'preference');
    assert.match(read('resources/js/pages/learning/MyLearning.tsx'), /Weekly study target:/);
    assert.match(read('resources/js/components/learning/PublicCourseCatalog.tsx'), /sort === 'recommended' && interest/);
    assert.match(read('resources/js/pages/exam/Index.tsx'), /exam_default_view === 'Practice mode' \? 'performance' : 'overview'/);
    assert.match(read('resources/js/components/exam/PmpExamReviewView.tsx'), /initiallyOpen=\{showRationales\}/);
    assert.match(read('app/Domain/Identity/Services/AccountSettingsCatalog.php'), /\$catalog \?\?= app\(QuestionCatalog::class\)->choices\(\)/);
    assert.match(read('app/Http/Requests/Settings/AccountSettingsRequest.php'), /AccountSettingsCatalog::hasInterviewInput/);
    assert.match(read('app/Http/Controllers/Interview/InterviewController.php'), /AccountSettingsCatalog::pages\(\$choices\)/);
});

test('follow admission enforces the target preference while existing followers can leave', () => {
    const controller = read('app/Http/Controllers/Members/MemberDirectoryController.php');
    assert.match(controller, /lockForUpdate\(\)->firstOrFail\(\)/);
    assert.match(controller, /abort_if\(\(\$target->account_preferences\['follow'\] \?\? 'Members only'\) === 'No one', 403/);
    assert.match(controller, /public function unfollow[\s\S]*?where\('follower_id', \$request->user\(\)->id\)->where\('followed_id', \$member->id\)->delete/);
    assert.match(read('resources/js/pages/members/Show.tsx'), /\(canFollow \|\| following\)/);
});

test('calendar file converts offsets, escapes injected lines and includes no member information', () => {
    const event = { slug: 'project-event', title: 'Planning, risk; review\nATTENDEE:injection', startsAt: '2026-12-10T09:30:00+06:00', endsAt: '2026-12-10T11:30:00+06:00', format: 'online' };
    const file = eventCalendar(event, 'https://example.com');
    assert.match(file, /DTSTART:20261210T033000Z\r\n/);
    assert.match(file, /DTEND:20261210T053000Z\r\n/);
    assert.match(file, /SUMMARY:Planning\\, risk\\; review\\nATTENDEE:injection/);
    assert.doesNotMatch(file, /\r\nATTENDEE:/);
    assert.equal(eventCalendar({...event, startsAt: 'invalid'}, 'https://example.com'), null);
    assert.match(read('app/Http/Controllers/PublicSite/EventPreviewController.php'), /'calendarEnabled' => \$registered && \(\$request->user\(\)->account_preferences\['eventCalendar'\] \?\? true\)/);
});

test('AI preferences reuse quota data and pinned prompt instructions without changing required errors', () => {
    assert.match(read('app/Domain/AI/Services/AiGateway.php'), /account_preferences\['aiLanguage'\][\s\S]*?Preserve JSON keys, enum values, scoring rules/);
    const tutor = read('resources/js/components/exam/PmpQuestionAiChat.tsx');
    assert.match(tutor, /warnLowBalance &&/);
    assert.match(tutor, /session.tokens\?\.remaining === 0 &&/);
    assert.match(tutor, /session.credits_available < settings.cost/);
});

test('payment history is private, bounded, on demand and not represented as invoices', () => {
    assert.equal(fields.invoice.mode, 'action');
    assert.match(fields.invoice.help, /not tax invoices/);
    const controller = read('app/Http/Controllers/Settings/AccountSettingsController.php');
    const method = controller.split('public function payments')[1].split('private function tokenBalance')[0];
    assert.match(method, /where\('user_id', \$request->user\(\)->id\)/);
    assert.match(method, /simplePaginate\(10,/);
    assert.match(method, /private, no-store/);
    assert.doesNotMatch(method, /gateway_transaction_id|checkout_url_encrypted/);
    assert.match(read('resources/js/pages/settings/account.tsx'), /modal === 'invoice' \? <PaymentHistory\/>/);
    assert.match(read('app/Http/Controllers/Settings/ProfileController.php'), /23503[\s\S]*?support-assisted removal/);
});
