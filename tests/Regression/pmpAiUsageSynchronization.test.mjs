import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('PMP dashboard reads the current gateway token quota, not the legacy ledger', () => {
    const controller = read('app/Http/Controllers/Exam/PmpExamController.php');
    const model = read('app/Domain/AI/Services/PmpAiUsageReadModel.php');
    const quota = read('app/Domain/AI/Services/AiChatQuotaService.php');
    assert.match(controller, /\$usage->summary\(\$request->user\(\)\)/);
    assert.match(model, /\$this->quotas->summary\(\$user, 'pmp_explain'\)/);
    assert.match(model, /where\('user_id', \$user->id\)/);
    assert.match(model, /whereIn\('feature_code', \['pmp_explain', 'pmp_followup'\]\)/);
    assert.match(quota, /'start_at' => \$start->toISOString\(\)/);
});

test('AI usage revalidates on tab open with a private, authenticated JSON route', () => {
    const routes = read('routes/web.php');
    const controller = read('app/Http/Controllers/Exam/PmpAiUsageController.php');
    const view = read('resources/js/pages/exam/Index.tsx');
    assert.match(routes, /Route::get\('\/exams\/pmp\/ai-usage'/);
    assert.match(controller, /abort_unless\(in_array\(\$plans->code/);
    assert.match(controller, /'Cache-Control', 'private, no-store'/);
    assert.match(view, /fetch\('\/exams\/pmp\/ai-usage'/);
    assert.match(view, /next === 'ai'/);
});

test('PMP chat hides all billing and provider token counters while preserving server enforcement', () => {
    const chat = read('resources/js/components/exam/PmpQuestionAiChat.tsx');
    const backend = read('app/Http/Controllers/Exam/PmpQuestionChatController.php');
    assert.doesNotMatch(chat, /pm-review-ai-chat-stats|pm-review-ai-token-stats|pm-review-ai-message-tokens/);
    assert.match(chat, /session\.tokens\.remaining === 0/);
    assert.match(chat, /accepted_max_credits: settings!\.cost/);
    assert.doesNotMatch(backend, /ar\.input_tokens|ar\.output_tokens|ar\.cached_tokens/);
    assert.match(chat, /settings\.cost > 0/); // Future paid messages still show explicit prices.
});
