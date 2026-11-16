<?php

namespace App\Http\Controllers\AI;

use App\Domain\AI\Services\AiGateway;
use App\Domain\AI\Support\AiFailure;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

final class AiConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(DB::table('ai_conversations')->where('user_id', $request->user()->id)
            ->where('status', 'active')->orderByDesc('id')
            ->select(['id', 'feature_scope', 'subject_type', 'created_at', 'updated_at'])
            ->simplePaginate(25));
    }

    public function show(Request $request, int $conversation): JsonResponse
    {
        $conversationRow = $this->own($request, $conversation);
        $messages = DB::table('ai_messages')->where('conversation_id', $conversation)
            ->orderByDesc('id')->limit(60)->get(['id', 'role', 'content_encrypted', 'created_at'])
            ->reverse()->map(fn ($m) => [
                'id' => $m->id, 'role' => $m->role,
                'content' => Crypt::decryptString($m->content_encrypted), 'created_at' => $m->created_at,
            ])->values();
        return response()->json(['id' => $conversationRow->id,
            'feature_scope' => $conversationRow->feature_scope, 'messages' => $messages]);
    }

    public function message(Request $request, int $conversation, AiGateway $gateway): JsonResponse
    {
        $conv = $this->own($request, $conversation);
        $input = $request->validate([
            'client_request_key' => ['required', 'uuid'],
            'message' => ['required', 'string', 'min:2', 'max:10000'],
            'accepted_max_credits' => ['required', 'integer', 'min:0', 'max:100000'],
        ]);
        if ($conv->feature_scope === 'feature:pmp') {
            $context = DB::table('ai_exam_contexts')->where('conversation_id', $conv->id)
                ->where('user_id', $request->user()->id)->first();
            abort_unless($context, 404);
            $input['subject'] = ['attempt_id' => $context->attempt_id, 'question_id' => $context->question_id];
            $input['feature'] = 'pmp_followup';
        } elseif ($conv->feature_scope === 'feature:ask_ai') {
            $input['feature'] = 'ask_ai';
            $input['subject'] = [];
        } else {
            abort(404);
        }
        $input['conversation_id'] = $conversation;
        try {
            $result = $gateway->submit($request->user(), $input);
            return response()->json($result, 202);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function destroy(Request $request, int $conversation): JsonResponse
    {
        $this->own($request, $conversation);
        // Financial/audit history is retained; content deletion follows approved retention policy.
        DB::table('ai_conversations')->where('id', $conversation)->where('user_id', $request->user()->id)
            ->update(['status' => 'closed', 'updated_at' => now()]);
        return response()->json(['status' => 'closed']);
    }

    private function own(Request $request, int $id): object
    {
        $conv = DB::table('ai_conversations')->where('id', $id)
            ->where('user_id', $request->user()->id)->where('status', 'active')->first();
        abort_unless($conv, 404);
        return $conv;
    }
}
