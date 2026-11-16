import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Review only mounts current-question chat, not legacy one-shot help', () => {
    const review = read('resources/js/pages/exam/Review.tsx');
    assert.match(review, /PmpQuestionAiChat key=\{question\.id\} attemptId=\{attempt\.id\} questionId=\{question\.id\}/);
    assert.doesNotMatch(review, /\/ai-help/);
});

test('Client sends selector IDs instead of answer keys or question bank', () => {
    const chat = read('resources/js/components/exam/PmpQuestionAiChat.tsx');
    assert.match(chat, /subject: \{ attempt_id: attemptId, question_id: questionId \}/);
    assert.match(chat, /accepted_max_credits: settings!\.cost/);
    assert.match(chat, /client_request_key: key/);
    assert.doesNotMatch(chat, /OPENAI_API_KEY|correct_option|question_ids/);
});

test('Backend scopes to completed owned attempt and one question', () => {
    const controller = read('app/Http/Controllers/Exam/PmpQuestionChatController.php');
    assert.match(controller, /where\('user_id', \$user->id\)->where\('status', 'completed'\)/);
    assert.match(controller, /in_array\(\$question, \$ids, true\)/);
    const context = read('app/Domain/AI/Services/AiSubjectContext.php');
    assert.match(context, /where\('user_id', \$user->id\)/);
    assert.match(context, /where\('status', 'completed'\)/);
});

test('Only PMP uses the restricted Responses-only moderation option', () => {
    const service = read('app/Domain/AI/Services/AiExecutionService.php');
    assert.match(service, /! \$isPmpTutor \|\| \(bool\) config\('pm-ai.pmp_external_moderation'\)/);
    const provider = read('app/Domain/AI/Providers/OpenAiResponsesProvider.php');
    assert.match(provider, /if \(\$useExternalModeration\)/);
    assert.match(provider, /'store' => false/);
});
