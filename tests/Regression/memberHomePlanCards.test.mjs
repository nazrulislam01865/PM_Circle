import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const cards = read('resources/js/components/dashboard/MemberHomeOverview.tsx');
const query = read('app/Domain/Dashboard/Queries/DashboardOverview.php');
const css = read('resources/css/pm-member-overview.css').split('/* Plan and practice cards:')[1];

test('both compact cards are between earned badges and profile insights', () => {
    const order = ['<h2>Earned badges</h2>', 'title="Plan & usage"', 'title="Practice & results"', '<h2>Profile insights</h2>'];
    const indices = order.map(text => cards.indexOf(text));
    assert.ok(indices.every((i, k) => i >= 0 && (k === 0 || i > indices[k - 1])));
    assert.equal(cards.match(/<OverviewSummaryCard title=/g)?.length, 2);
    assert.match(cards, /className="pm-dash-card pm-member-overview-card pm-member-overview-summary"/);
});
test('plan and simulator links use existing protected destinations and real entitlement', () => {
    assert.match(cards, /href="\/membership" action="View usage"/);
    assert.match(cards, /href="\/exams\/pmp\/enter" action="View exam simulator"/);
    assert.match(cards, /href="\/dashboard\/learning\/my-learning"[^>]*>Continue learning/);
    assert.match(cards, /planUsage.examAccess \? 'Included' : 'Premium access'/);
    assert.match(query, /MemberFeatureAccess::allowsExamSimulator\(\$actualPlan\)/);
    assert.match(query, /'plan' => \$actualPlan/);
    assert.match(read('app/Http/Controllers/Exam/PmpExamController.php'), /\? to_route\('exams.pmp.index'\)\s*: to_route\('exams.pmp.public'\)/);
});
test('quota is read only for entitled users, no sample balance or usage ledger on homepage', () => {
    assert.match(query, /\$tokens = \$examAccess\s*\? app\(PmpAiUsageReadModel::class\)->summary\(\$user, includeActivity: false\)/);
    assert.match(query, /\(int\) \$tokens\['remaining'\] : null/);
    assert.match(cards, /planUsage.tokensRemaining !== null/);
    assert.doesNotMatch(cards, /8,000|8000|50000|fetch\(/);
    assert.match(read('app/Domain/AI/Services/PmpAiUsageReadModel.php'), /\$activity = \$includeActivity \? DB::table\('ai_requests'\)/);
});
test('new card styles use centralized type, spacing and color tokens and wrap at narrow widths', () => {
    assert.match(css, /flex-wrap:wrap/);
    assert.match(css, /var\(--font-ui\)/);
    assert.doesNotMatch(css, /#[\da-f]{3,8}\b|font-size:\s*\d|(?:[2-9]|[1-9]\d+)px\b/i);
    for (const [, token] of css.matchAll(/var\((--[\w-]+)/g)) {
        assert.ok(read('resources/css/pm-design-tokens.css').includes(`${token}:`), token);
    }
});
