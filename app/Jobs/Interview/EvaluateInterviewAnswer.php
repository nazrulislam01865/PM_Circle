<?php

namespace App\Jobs\Interview;

use App\Services\AI\InterviewEvaluationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

final class EvaluateInterviewAnswer implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;
    public int $timeout = 80;
    public array $backoff = [5, 15];

    public function __construct(public readonly int $answerId) {}

    public function handle(InterviewEvaluationService $ai): void
    {
        // Pause the legacy queue worker too: already queued jobs must never call OpenAI.
        if (! config('pm-interview.ai_feedback_enabled', false)) return;

        $row = DB::table('interview_answers as a')
            ->join('interview_sessions as s', 's.id', '=', 'a.interview_session_id')
            ->where('a.id', $this->answerId)
            ->first(['a.id', 'a.answer', 'a.status', 'a.position', 's.questions', 's.role', 's.industry', 's.experience', 's.user_id', 's.id as session_id']);
        if (! $row || $row->status !== 'pending') return;

        $questions = json_decode($row->questions, true, 512, JSON_THROW_ON_ERROR);
        $prompt = $questions[$row->position]['text'] ?? null;
        if (! is_string($prompt)) return;

        $result = $ai->evaluate($prompt, $row->answer, $row->role, $row->industry, $row->experience);
        DB::transaction(function () use ($result, $row) {
            $updated = DB::table('interview_answers')->where('id', $this->answerId)->where('status', 'pending')->update([
                'status' => 'evaluated', 'evaluation' => json_encode($result['evaluation'], JSON_THROW_ON_ERROR),
                'score' => $result['evaluation']['score'], 'ai_model' => $result['model'],
                'input_tokens' => $result['input_tokens'], 'output_tokens' => $result['output_tokens'],
                'evaluated_at' => now(), 'updated_at' => now(),
            ]);
            if ($updated) {
                $estimatedCost = (
                    $result['input_tokens'] * max(0, (float) config('pm-interview.input_usd_per_million')) +
                    $result['output_tokens'] * max(0, (float) config('pm-interview.output_usd_per_million'))
                ) / 1000000;
                // A separate immutable ledger preserves usage after a member tries the answer again.
                DB::table('interview_ai_usage')->insert([
                    'user_id' => $row->user_id, 'interview_session_id' => $row->session_id,
                    'position' => $row->position, 'model' => $result['model'],
                    'input_tokens' => $result['input_tokens'], 'output_tokens' => $result['output_tokens'],
                    'estimated_cost_usd' => round($estimatedCost, 6), 'created_at' => now(),
                ]);
            }
        });
    }

    public function failed(?Throwable $exception): void
    {
        DB::table('interview_answers')->where('id', $this->answerId)->where('status', 'pending')
            ->update(['status' => 'failed', 'updated_at' => now()]);
        // Never log interview content or provider credentials.
        Log::warning('Interview assessment unavailable', ['answer_id' => $this->answerId, 'error_type' => $exception ? $exception::class : 'Unknown']);
    }
}
