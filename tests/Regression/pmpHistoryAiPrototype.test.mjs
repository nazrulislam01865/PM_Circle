import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('history prototype keeps real filters, authorized navigation, expandable summary and pagination', () => {
    const panel = source('resources/js/components/exam/PmpWorkspacePanels.tsx');
    const css = source('resources/css/pm-pmp-workspace.css');
    for (const text of ['Exam history', 'All times in Bangladesh time.', 'Start a new mock exam',
        'All exam types', 'All statuses', 'Date range', 'Time allowed', 'Time used',
        'Time left', 'Expanded attempt summary', 'Answered', 'Unanswered', 'Flagged', 'Load Older Attempts']) {
        assert.ok(panel.includes(text) || (text === 'Expanded attempt summary' && panel.includes('Expanded attempt summary')), `Missing ${text}`);
    }
    assert.match(panel, /fetch\(`\/exams\/pmp\/history\?before=\$\{nextCursor\}`/);
    assert.match(panel, /examReview\(attempt\.id\)/);
    assert.match(panel, /isResumable\(attempt\)/);
    assert.match(css, /\.pm-pmp-history-surface/);
    assert.match(css, /\.pm-pmp-history-details/);
});

test('AI usage presents only recorded data and refill prices from a server-owned catalog', () => {
    const panel = source('resources/js/components/exam/PmpWorkspacePanels.tsx');
    const refill = source('resources/js/components/exam/PmpAiRefillPanel.tsx');
    const controller = source('app/Http/Controllers/Billing/AiCreditCheckoutController.php');
    assert.match(panel, /usage\.activity\.map/);
    assert.match(panel, /usage\.allocated/);
    assert.match(panel, /usage\.remaining/);
    assert.match(panel, /PmpAiRefillPanel eligible=\{isPaid\}/);
    assert.match(refill, /fetch\('\/billing\/ai-packages'/);
    assert.match(refill, /fetch\('\/billing\/ai-checkout'/);
    assert.match(refill, /package_id: pack\.id, client_request_key: key, provider/);
    assert.match(refill, /crypto\.randomUUID\(\)/);
    assert.match(refill, /!eligible/);
    assert.match(refill, /!catalog\?\.enabled/);
    assert.match(refill, /monthly PMP token limit/);
    assert.doesNotMatch(refill, /50,000 tokens|25,000 tokens|Stripe|Nagad|Sample data/);
    assert.match(refill, /bKash/);
    assert.match(refill, /SSLCommerz/);
    assert.match(refill, /catalog\.providers\.includes/);
    assert.match(controller, /whereBetween\('price_minor'/);
    assert.match(controller, /'providers' => \$providers/);
    assert.match(controller, /'provider' => \['nullable', 'in:bkash,sslcommerz'\]/);
    assert.match(panel, /<section className="pm-pmp-ai-grid"/);
    assert.doesNotMatch(panel, /<Surface className="pm-pmp-ai-surface"/);
});
