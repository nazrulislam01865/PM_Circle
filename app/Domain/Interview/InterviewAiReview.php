<?php

namespace App\Domain\Interview;

use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Billing\Queries\MemberFeatureAccess;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** The central gateway reviews an exact, saved, member-owned answer revision. */
final class InterviewAiReview
{
    public const FEATURE = 'interview_answer_review';

    public static function revision(string $answer, string $mode): string
    {
        return hash('sha256', json_encode([$answer, $mode], JSON_THROW_ON_ERROR));
    }

    public function context(User $user, array $subject, bool $consent, bool $lock = false): array
    {
        if (! config('pm-interview.enabled')) throw new AiFailure('FEATURE_DISABLED', 503);
        if (! $consent) throw new AiFailure('CONSENT_REQUIRED', 422);
        $query = DB::table('interview_answers as a')->join('interview_sessions as s', 's.id', '=', 'a.interview_session_id')
            ->where('a.id', (int) ($subject['answer_id'] ?? 0))->where('s.user_id', $user->id);
        if ($lock) $query->lockForUpdate();
        $row = $query->first(['a.id', 'a.answer', 'a.mode', 'a.position', 'a.status', 'a.ai_review_request_id',
            's.questions', 's.role', 's.industry', 's.experience', 's.profession', 's.status as session_status']);
        if (! $row || ! in_array($row->session_status, ['in_progress', 'completed'], true)) throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
        if ($row->status !== 'evaluated' || ! is_string($row->answer) || trim($row->answer) === '') throw new AiFailure('ANSWER_REVIEW_NOT_READY', 422);
        if (! hash_equals(self::revision($row->answer, $row->mode), (string) ($subject['answer_revision'] ?? ''))) throw new AiFailure('ANSWER_CHANGED', 409);
        $question = json_decode($row->questions, true, 512, JSON_THROW_ON_ERROR)[$row->position] ?? null;
        if (! is_string($question['text'] ?? null)) throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
        return ['subject_type' => 'interview_answer', 'subject_id' => $row->id,
            'context' => ['question' => $question['text'], 'candidate_answer' => $row->answer,
                'reference_guidance' => $question['answer_guidance'] ?? null, 'role' => $row->role, 'industry' => $row->industry, 'experience' => $row->experience, 'profession' => $row->profession],
            'message' => null, 'existing_review_id' => $row->ai_review_request_id];
    }

    public function offer(User $user): ?array
    {
        if (! config('pm-ai.enabled') || ! config('pm-interview.enabled')) return null;
        try { $feature = app(AiFeatureCatalog::class)->get(self::FEATURE); }
        catch (AiFailure) { return null; }
        $plan = app(CurrentMemberPlan::class)->code($user);
        if (! MemberFeatureAccess::allowsAi($plan, self::FEATURE, $feature->min_plan)) return null;
        return ['credits' => (int) $feature->credit_tariff];
    }
}
