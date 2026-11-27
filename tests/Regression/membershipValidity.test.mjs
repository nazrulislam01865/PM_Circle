import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('signup and plan switching persist the selected catalogue duration under the member lock', () => {
    const action = read('app/Domain/Billing/Actions/SetTemporaryMembership.php');
    const signup = read('app/Http/Controllers/Onboarding/OnboardingController.php');
    assert.match(action, /lockForUpdate\(\)/);
    assert.match(action, /onboarding_step >= 3/);
    assert.match(action, /where\('months', \$months\)->where\('active', true\)/);
    assert.match(action, /addMonthsNoOverflow\(\$term\)/);
    assert.match(signup, /\(int\) \$data\['months'\], signup: true/);
    assert.match(read('resources/js/pages/auth/RegisterStep3.tsx'), /plan.code !== 'free' && plan.prices.length > 0/);
    assert.match(read('resources/js/pages/billing/Membership.tsx'), /router.post\('\/membership\/temporary', \{ plan, months \}/);
});

test('the same active-term predicate governs code, plan details and directory membership', () => {
    const query = read('app/Domain/Billing/Queries/CurrentMemberPlan.php');
    assert.match(query, /where\('starts_at', '<=', \$now\)->where\('ends_at', '>', \$now\)/);
    assert.equal(query.match(/self::activeComplimentaryGrants\(\)/g)?.length, 2);
    assert.match(read('app/Http/Controllers/Members/MemberDirectoryController.php'), /CurrentMemberPlan::activeComplimentaryGrants\(\)/);
});

test('PMP workspace keeps its three overview cards and centralizes five tab dropdowns without extra AI header', () => {
    const panels = read('resources/js/components/exam/PmpWorkspacePanels.tsx');
    assert.equal(panels.match(/<PMDropdown id="pmp-/g)?.length, 5);
    assert.doesNotMatch(panels, /<select|Live account data|pm-pmp-ai-top|Complimentary access has no billed activation/);
    assert.match(panels, /planDetails\.months/);
    assert.match(panels, /dateLabel\(planDetails\.ends_at, true\)/);
    assert.match(panels, /PmpAiRefillPanel eligible=\{isPaid\}/);
});


test('signup plan cards are admin controlled and hidden plans cannot be selected by direct signup POST', () => {
    const admin = read('app/Http/Controllers/Admin/MembershipValidityController.php');
    const signup = read('app/Http/Controllers/Onboarding/OnboardingController.php');
    const grant = read('app/Domain/Billing/Actions/SetTemporaryMembership.php');
    const card = read('resources/js/components/onboarding/SignupPlanCard.tsx');
    const editor = read('resources/js/pages/admin/MembershipValidity.tsx');
    assert.match(signup, /catalog\(signup: true\)/);
    assert.match(signup, /where\('signup_visible', true\)/);
    assert.match(grant, /where\('signup_visible', true\)/);
    assert.match(admin, /function saveSignupPlan/);
    assert.match(admin, /'signup_visible' => \$plan === 'free'/);
    assert.match(card, /plan\.signup_badge/);
    assert.doesNotMatch(card, /const planBadges/);
    assert.match(editor, /<PMDropdown id="signup-plan-editor"/);
    assert.match(editor, /signup-plans\/\$\{plan\.code\}/);
    assert.match(read('routes/web.php'), /membership-validity\/signup-plans\/\{plan\}/);
});


test('production signup grants and post-signup demo switching use separate controls', () => {
    const action = read('app/Domain/Billing/Actions/SetTemporaryMembership.php');
    const controller = read('app/Http/Controllers/Billing/TemporaryMembershipController.php');
    assert.match(action, /function switchingEnabled\(\)/);
    assert.match(action, /self_service_complimentary_switching_enabled/);
    assert.match(controller, /abort_unless\(SetTemporaryMembership::switchingEnabled\(\), 403\)/);
    assert.match(read('config/pm-circle.php'), /PMC_SELF_SERVICE_COMPLIMENTARY_SWITCHING_ENABLED', false/);
});


test('validity management uses explicit member name/email search and a compact on-demand duration editor', () => {
    const editor = read('resources/js/pages/admin/MembershipValidity.tsx');
    const controller = read('app/Http/Controllers/Admin/MembershipValidityController.php');
    assert.match(editor, /Member name or email/);
    assert.doesNotMatch(editor, /<span>Member ID<\/span>/);
    assert.match(editor, /memberMatches\.map/);
    assert.match(editor, /only: id \? \['member', 'memberId', 'errors'\]/);
    assert.match(editor, /editor && <form/);
    assert.match(editor, /readOnly=\{editor === 'edit'\}/);
    assert.match(editor, /<PMDropdown id="duration-plan-filter"/);
    assert.match(editor, /<PMDropdown id="member-term-start"/);
    assert.match(controller, /'prices' => fn/);
    assert.match(controller, /'signupPlans' => fn/);
    assert.match(controller, /mb_strlen\(\$search\) < 2/);
    assert.match(controller, /LOWER\(member\.email\) LIKE \?/);
    assert.match(controller, /limit\(20\)/);
    assert.match(controller, /where\('member\.is_admin', false\)->whereIn\('grant\.plan_code', \['plus', 'pro'\]\)/);
});
