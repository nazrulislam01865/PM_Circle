import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('PMP provider keeps latest user question last and only one completed question in context', () => {
    const provider = read('app/Domain/AI/Providers/OpenAiResponsesProvider.php');
    assert.match(provider, /private function pmpMessages\(/);
    assert.match(provider, /'role' => 'user', 'content' => \$latest/);
    assert.match(provider, /\$body\['reasoning'\]/);
    assert.match(provider, /'minimal'/);
});

test('Member reply quota is distinct from request-linked token accounting', () => {
    const gateway = read('app/Domain/AI/Services/AiGateway.php');
    const tokens = read('app/Domain/AI/Services/AiPmpTokenQuotaService.php');
    assert.match(gateway, /\$this->tokens->reserve\(/);
    assert.match(tokens, /AI_TOKEN_LIMIT_REACHED/);
    assert.match(tokens, /ai_pmp_token_allocations/);
    assert.match(tokens, /used_tokens/);
});

test('Responses are direct, bounded, and nullable next-step does not force filler', () => {
    const executor = read('app/Domain/AI/Services/AiExecutionService.php');
    const catalog = read('app/Domain/AI/Services/AiFeatureCatalog.php');
    assert.match(executor, /LATEST member message directly/);
    assert.match(executor, /Study next:/);
    assert.match(catalog, /\['string', 'null'\]/);
});

test('Member endpoint remains owner-scoped and returns token usage without N+1 queries', () => {
    const controller = read('app/Http/Controllers/Exam/PmpQuestionChatController.php');
    assert.match(controller, /where\('user_id', \$user->id\)/);
    assert.match(controller, /status', 'completed'/);
    assert.match(controller, /leftJoin\('ai_requests as ar'/);
    assert.match(controller, /'tokens' => \$tokenSummary/);
});

test('Local configuration remains limited and token migration is additive', () => {
    const setup = read('app/Console/Commands/ConfigurePmpAiChat.php');
    const migration = read('database/migrations/2026_11_16_030000_add_pmp_ai_token_usage.php');
    assert.match(setup, /--local-test/);
    assert.match(setup, /cycle-tokens/);
    assert.match(migration, /ai_pmp_token_events/);
    assert.match(migration, /max_cycle_tokens/);
});
