<?php

namespace App\Http\Controllers\Exam;

use App\Domain\AI\Services\AiChatQuotaService;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/** Lazy, owner-scoped read model for the ONE question currently open in exam review. */
final class PmpQuestionChatController extends Controller
{
    public function show(Request $request, int $attempt, int $question,
        CurrentMemberPlan $plans, AiChatQuotaService $quotas): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($plans->code($user), ['plus', 'pro'], true), 403);

        $exam = DB::table('pmp_exam_attempts')->where('id', $attempt)
            ->where('user_id', $user->id)->where('status', 'completed')
            ->first(['question_ids']);
        abort_unless($exam, 404);
        $ids = array_map('intval', json_decode($exam->question_ids, true, 512, JSON_THROW_ON_ERROR));
        abort_unless(in_array($question, $ids, true), 404);

        $conversationId = DB::table('ai_exam_contexts')->where('user_id', $user->id)
            ->where('attempt_id', $attempt)->where('question_id', $question)
            ->value('conversation_id');

        if ($conversationId) {
            abort_unless(DB::table('ai_conversations')->where('id', $conversationId)
                ->where('user_id', $user->id)->where('status', 'active')->exists(), 404);
        }
        $messages = [];
        $firstCompleted = false;
        $pending = null;
        if ($conversationId) {
            $firstCompleted = DB::table('ai_requests')->where('conversation_id', $conversationId)
                ->where('feature_code', 'pmp_explain')->where('status', 'completed')->exists();
            $pending = DB::table('ai_requests')->where('conversation_id', $conversationId)
                ->whereIn('status', ['queued', 'running', 'provider_status_unknown'])
                ->orderByDesc('id')->first(['request_uuid', 'status']);
            $messages = DB::table('ai_messages as am')
                ->where('am.conversation_id', $conversationId)
                ->orderByDesc('am.id')->limit(60)
                ->get(['am.id', 'am.role', 'am.content_encrypted', 'am.created_at'])
                ->reverse()->map(static function ($item): array {
                    $text = Crypt::decryptString($item->content_encrypted);
                    // Assistant messages are persisted as validated JSON; member messages are plain text.
                    $content = $item->role === 'assistant' ? json_decode($text, true) : $text;
                    return ['id' => (int) $item->id, 'role' => $item->role,
                        'content' => $content, 'created_at' => $item->created_at];
                })->values()->all();
        }

        $features = DB::table('ai_features')->whereIn('code', ['pmp_explain', 'pmp_followup'])
            ->get(['code', 'enabled', 'credit_tariff', 'max_input_chars'])->keyBy('code');
        $explain = $features->get('pmp_explain');
        $followup = $features->get('pmp_followup');
        $limits = null;
        $limitError = null;
        $tokenSummary = null;
        if (config('pm-ai.enabled')) {
            try {
                $limits = $quotas->summary($user, 'pmp_explain', $conversationId ? (int) $conversationId : null);
                $tokenSummary = $limits['tokens'] ?? null;
            } catch (AiFailure $e) {
                $limitError = $e->safeCode;
            }
        }

        return response()->json([
            'conversation_id' => $conversationId ? (int) $conversationId : null,
            'first_completed' => $firstCompleted,
            'messages' => $messages,
            'pending' => $pending ? [
                'request_id' => $pending->request_uuid, 'status' => $pending->status,
            ] : null,
            'credits_available' => (int) (DB::table('ai_credit_wallets')
                ->where('user_id', $user->id)->value('available') ?? 0),
            'features' => [
                'pmp_explain' => ['enabled' => (bool) (config('pm-ai.enabled') && $explain?->enabled),
                    'cost' => (int) ($explain?->credit_tariff ?? 0),
                    'max_chars' => min(2000, (int) ($explain?->max_input_chars ?? 2000))],
                'pmp_followup' => ['enabled' => (bool) (config('pm-ai.enabled') && $followup?->enabled),
                    'cost' => (int) ($followup?->credit_tariff ?? 0),
                    'max_chars' => min(2000, (int) ($followup?->max_input_chars ?? 2000))],
            ],
            'limits' => $limits,
            'tokens' => $tokenSummary,
            'limit_error' => $limitError,
        ])->header('Cache-Control', 'private, no-store');
    }
}
