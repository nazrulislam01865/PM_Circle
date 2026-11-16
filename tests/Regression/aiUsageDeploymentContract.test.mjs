import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('AI reporting has a dedicated time-filter index and safe bounded row reads', () => {
    assert.match(read('database/migrations/2026_11_16_040000_index_ai_usage_reporting.php'), /ai_requests_created_at_reporting_idx/);
    const source = read('app/Http/Controllers/Admin/AI/AiUsageDashboardController.php');
    assert.match(source, /ROW_NUMBER\(\) OVER \(PARTITION BY plan_code, feature_scope/);
    assert.match(source, /orderByDesc\('o\.id'\)->limit\(40\)/);
    assert.match(source, /orderByDesc\('id'\)->limit\(15\)/);
});

test('runtime directories remain in source archives without compiled templates', () => {
    for (const p of ['storage/framework/views/.gitignore','storage/framework/cache/data/.gitignore','storage/framework/sessions/.gitignore','bootstrap/cache/.gitignore']) {
        assert.match(read(p), /!\.gitignore/);
    }
});
