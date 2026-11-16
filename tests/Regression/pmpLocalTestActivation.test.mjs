import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('local test setup is explicitly opt-in and cannot be used in production', () => {
    const command = source('app/Console/Commands/ConfigurePmpAiChat.php');
    assert.match(command, /\{--local-test :/);
    assert.match(command, /environment\('production'\)/);
    assert.match(command, /environment\(\['local', 'testing'\]\)/);
    assert.match(command, /'pmp_explain' => 'explain-credits', 'pmp_followup' => 'followup-credits'/);
    assert.match(command, /'explain-credits' => '0', 'followup-credits' => '0'/);
    assert.match(command, /'daily-limit' => '10', 'cycle-limit' => '50'/);
});

test('chat keeps the composer visible but blocks unconfigured submissions', () => {
    const chat = source('resources/js/components/exam/PmpQuestionAiChat.tsx');
    assert.match(chat, /\{settings && <form className="pm-review-ai-composer"/);
    assert.match(chat, /!settings\?\.enabled/);
    assert.match(chat, /disabled=\{cannotSend\}/);
    assert.doesNotMatch(chat, /No member credit charge/);
    assert.match(chat, /settings.cost > 0/);
});
