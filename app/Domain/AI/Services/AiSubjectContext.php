<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use App\Models\ProfileResume;
use App\Models\User;
use App\Services\Resume\ResumeTextExtractor;
use Illuminate\Support\Facades\DB;

final class AiSubjectContext
{
    public function __construct(private readonly ResumeTextExtractor $extractor) {}

    /** Never take question/answer keys, resume text or rubric definitions from the member's request. */
    public function resolve(User $user, string $feature, array $subject, ?string $message = null,
        bool $consent = false, bool $includeResumeText = true): array
    {
        if (in_array($feature, ['pmp_explain', 'pmp_followup'], true)) {
            if ($feature === 'pmp_followup' && mb_strlen(trim((string) $message)) < 2) {
                throw new AiFailure('MESSAGE_REQUIRED', 422);
            }
            $attemptId = (int) ($subject['attempt_id'] ?? 0);
            $questionId = (int) ($subject['question_id'] ?? 0);
            $attempt = DB::table('pmp_exam_attempts')->where('user_id', $user->id)
                ->where('id', $attemptId)->where('status', 'completed')->first(['id', 'question_ids']);
            if (! $attempt || ! in_array($questionId, array_map('intval',
                json_decode($attempt->question_ids, true, 512, JSON_THROW_ON_ERROR)), true)) {
                throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
            }
            $question = DB::table('pmp_exam_questions')->where('id', $questionId)
                ->first(['prompt', 'options', 'correct_option', 'explanation',
                    'domain', 'difficulty', 'other_options', 'takeaway', 'concepts', 'references']);
            if (! $question) {
                throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
            }
            $choice = DB::table('pmp_exam_attempt_answers')->where('attempt_id', $attemptId)
                ->where('question_id', $questionId)->value('choice');
            return ['subject_type' => 'pmp_attempt_question', 'subject_id' => $questionId,
                'attempt_id' => $attemptId, 'question_id' => $questionId,
                'context' => ['question' => mb_substr($question->prompt, 0, 2400),
                    'options' => json_decode($question->options, true),
                    'correct_answer' => $question->correct_option, 'member_answer' => $choice,
                    'reference_explanation' => mb_substr((string) $question->explanation, 0, 1800),
                    'domain' => $question->domain,
                    'difficulty' => $question->difficulty,
                    'other_options_explanation' => mb_substr((string) $question->other_options, 0, 1800),
                    'key_takeaway' => mb_substr((string) $question->takeaway, 0, 1200),
                    'related_concepts' => mb_substr((string) $question->concepts, 0, 1200),
                    'question_references' => mb_substr((string) $question->references, 0, 1200)],
                'message' => $message];
        }
        if (in_array($feature, ['scenario_review', 'scenario_comment_review', 'daily_challenge_review'], true)) {
            $responseId = (int) ($subject['response_id'] ?? 0);
            $record = DB::table('scenario_responses as sr')
                ->join('scenarios as s', 's.id', '=', 'sr.scenario_id')
                ->where('sr.id', $responseId)->where('sr.user_id', $user->id)
                ->when($feature !== 'daily_challenge_review', fn ($query) => $query->where('s.status', 'published'))
                ->when($feature === 'daily_challenge_review', fn ($query) => $query->where('s.ai_generated', true)
                    ->whereNotNull('s.daily_slot')->whereIn('s.status', ['published', 'closed']))
                ->first(['sr.id', 'sr.parent_id', 'sr.body', 's.id as scenario_id',
                    's.title', 's.situation', 's.known_facts']);
            if (! $record || (in_array($feature, ['scenario_review', 'daily_challenge_review'], true) && $record->parent_id !== null)) {
                throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
            }
            $rubric = DB::table('scenario_rubric_versions')->where('scenario_id', $record->scenario_id)
                ->orderByDesc('version')->first();
            if (! $rubric) {
                throw new AiFailure('RUBRIC_NOT_APPROVED', 409);
            }
            return ['subject_type' => 'scenario_response', 'subject_id' => $record->id,
                'rubric_id' => $rubric->id, 'rubric' => ['criteria' => json_decode($rubric->criteria_json, true),
                    'max_score' => $rubric->max_score], 'context' => [
                    'scenario_id' => $record->scenario_id, 'scenario_title' => $record->title, 'situation' => mb_substr($record->situation, 0, 4000),
                    'facts' => json_decode($record->known_facts, true),
                    'member_response' => mb_substr($record->body, 0, 6500),
                    'rubric' => json_decode($rubric->criteria_json, true)], 'message' => null];
        }
        if (in_array($feature, ['resume_analyze', 'resume_rewrite'], true)) {
            if (! $consent) {
                throw new AiFailure('CONSENT_REQUIRED', 422);
            }
            $resume = ProfileResume::query()->where('user_id', $user->id)
                ->find((int) ($subject['resume_id'] ?? 0));
            if (! $resume) {
                throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
            }
            // CPU/IO intensive PDF/DOCX extraction runs only inside the queue worker.
            // The admission payload never stores raw resume content.
            $text = $includeResumeText ? $this->extractor->extract($resume) : '';
            $section = (string) ($subject['section'] ?? '');
            if ($feature === 'resume_rewrite' && trim($section) === '') {
                throw new AiFailure('RESUME_SECTION_REQUIRED', 422);
            }
            return ['subject_type' => 'profile_resume', 'subject_id' => $resume->id,
                'context' => ['resume_excerpt' => mb_substr($text, 0, $feature === 'resume_analyze' ? 18000 : 5000),
                    'estimated_input_chars' => $feature === 'resume_analyze' ? 18000 : 5000,
                    'section' => mb_substr($section, 0, 60)], 'message' => $message];
        }
        if ($feature === 'ask_ai') {
            if (mb_strlen(trim((string) $message)) < 2) {
                throw new AiFailure('MESSAGE_REQUIRED', 422);
            }
            return ['subject_type' => null, 'subject_id' => null, 'context' => [], 'message' => $message];
        }
        throw new AiFailure('FEATURE_UNAVAILABLE', 404);
    }
}
