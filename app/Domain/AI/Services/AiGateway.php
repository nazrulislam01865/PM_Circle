<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Jobs\ExecuteAiRequest;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AiGateway
{
    public function __construct(
        private readonly AiFeatureCatalog $catalog,
        private readonly AiSubjectContext $contexts,
        private readonly AiChatQuotaService $quota,
        private readonly AiCreditService $credits,
        private readonly AiBudgetService $budget,
        private readonly AiPmpTokenQuotaService $tokens,
        private readonly CurrentMemberPlan $plans,
    ) {}

    /** Admission is transactional; no external request is made until durable reservation commits. */
    public function submit(User $user, array $input): array
    {
        $featureCode = (string) $input['feature'];
        if (in_array($featureCode, ['scenario_generate', 'trend_draft'], true)) {
            throw new AiFailure('FEATURE_UNAVAILABLE', 404);
        }
        // Retries must retrieve the same accepted operation, even after a flag/price/plan change.
        $key = (string) $input['client_request_key'];
        $existing = DB::table('ai_requests')->where('user_id', $user->id)
            ->where('client_key', $key)->first();
        if ($existing) {
            return $this->receipt($existing);
        }
        $feature = $this->catalog->get($featureCode);
        $plan = $this->plans->code($user);
        $rank = ['free' => 0, 'plus' => 1, 'pro' => 2];
        $minPlan = AiFeatureCatalog::FEATURES[$featureCode]['min_plan'];
        if (($rank[$plan] ?? 0) < ($rank[$minPlan] ?? 99)
            || ($rank[$feature->min_plan] ?? 99) > ($rank[$plan] ?? 0)) {
            throw new AiFailure('NOT_ENTITLED', 403);
        }
        // Testing-only temporary grants cannot be mistaken for a paid entitlement.
        if ($this->plans->details($user)['source'] === 'complimentary'
            && ! config('pm-ai.allow_demo_credit_grants')) {
            throw new AiFailure('NOT_ENTITLED', 403);
        }
        if (DB::table('ai_credit_orders')->where('user_id', $user->id)
            ->where('status', 'reversal_review')->exists()) {
            throw new AiFailure('PAYMENT_REVIEW_REQUIRED', 403);
        }
        $message = $input['message'] ?? null;
        if (is_string($message) && mb_strlen($message) > $feature->max_input_chars) {
            throw new AiFailure('MESSAGE_TOO_LONG', 422);
        }
        $max = (int) $input['accepted_max_credits'];
        if ($feature->credit_tariff > $max) {
            throw new AiFailure('PRICE_CHANGED', 409);
        }
        if (! config('pm-ai.api_key')) {
            throw new AiFailure('PROVIDER_NOT_CONFIGURED', 503);
        }
        $rateKey = 'ai-admission:'.$user->id;
        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($rateKey,
            (int) config('pm-ai.max_requests_per_minute'))) {
            throw new AiFailure('RATE_LIMITED', 429);
        }
        \Illuminate\Support\Facades\RateLimiter::hit($rateKey, 60);
        $subject = $input['subject'] ?? [];
        $context = $this->contexts->resolve($user, $featureCode, $subject,
            $message, (bool) ($input['consent'] ?? false), false);
        $prompt = DB::table('ai_prompt_versions')->where('feature_code', $featureCode)
            ->where('version', $feature->prompt_version)->whereNotNull('published_at')->first();
        if (! $prompt) {
            throw new AiFailure('PROMPT_NOT_PUBLISHED', 503);
        }
        $price = DB::table('ai_model_prices')->where('model', $feature->model)
            ->where('effective_from', '<=', now())->orderByDesc('effective_from')->first();
        if (! $price) {
            throw new AiFailure('MODEL_PRICE_NOT_APPROVED', 503);
        }
        // Expose only an internally trusted price snapshot; never accept price/model from HTTP clients.
        $priceSnapshot = ['input' => (string) $price->input_usd_per_m,
            'cached' => (string) $price->cached_input_usd_per_m,
            'output' => (string) $price->output_usd_per_m, 'price_id' => (int) $price->id];
        return DB::transaction(function () use ($user, $feature, $featureCode, $key, $input,
            $context, $prompt, $priceSnapshot): array {
            // Serialize same-member admission before creating conversations or usage buckets.
            // Each caller rechecks idempotency under this lock; wallet/grants are locked
            // only after chat buckets, preserving the canonical financial lock order.
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first(['id']);
            $duplicate = DB::table('ai_requests')->where('user_id', $user->id)
                ->where('client_key', $key)->first();
            if ($duplicate) {
                return $this->receipt($duplicate);
            }
            if ($feature->daily_limit !== null) {
                $usedToday = DB::table('ai_requests')->where('user_id', $user->id)
                    ->where('feature_code', $featureCode)
                    ->where('created_at', '>=', now('UTC')->startOfDay())
                    ->whereNotIn('status', ['failed', 'cancelled'])->count();
                if ($usedToday >= $feature->daily_limit) {
                    throw new AiFailure('FEATURE_DAILY_LIMIT_REACHED', 429);
                }
            }
            $conversationId = $this->conversation($user, $featureCode, $context, $input);
            $requestId = DB::table('ai_requests')->insertGetId([
                'request_uuid' => (string) Str::uuid(), 'user_id' => $user->id,
                'feature_code' => $featureCode, 'client_key' => $key,
                'subject_type' => $context['subject_type'], 'subject_id' => $context['subject_id'],
                'conversation_id' => $conversationId, 'status' => 'queued',
                'prompt_version' => $feature->prompt_version,
                'max_output_tokens' => $feature->max_output_tokens, 'tariff_version' => $feature->tariff_version,
                'schema_version' => 1, 'model' => $feature->model,
                'estimated_hold' => $feature->credit_tariff,
                'payload_encrypted' => Crypt::encryptString(json_encode([
                    'subject' => $input['subject'] ?? [], 'consent' => (bool) ($input['consent'] ?? false),
                    'message' => $input['message'] ?? null, 'context' => $context,
                    'instructions' => $prompt->template,
                ], JSON_THROW_ON_ERROR)),
                'model_price_snapshot' => json_encode($priceSnapshot, JSON_THROW_ON_ERROR),
                'lease_until' => now()->addSeconds((int) config('pm-ai.lease_seconds')),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->budget->reserve($requestId, $featureCode, $context, $priceSnapshot,
                (int) $feature->max_output_tokens);
            if ($this->catalog->isChat($featureCode)) {
                $snapshot = $this->quota->reserve($user, $requestId, $featureCode, $conversationId);
                DB::table('ai_requests')->where('id', $requestId)->update([
                    'chat_policy_version' => $snapshot['policy_version'],
                    'resolved_limits_json' => json_encode($snapshot['buckets']),
                ]);
                if (in_array($featureCode, ['pmp_explain', 'pmp_followup'], true)) {
                    $this->tokens->reserve($user, $requestId, $featureCode, $context,
                        (int) $feature->max_output_tokens, $snapshot['pmp_tokens'] ?? []);
                }
            }
            $this->credits->reserve($user->id, $requestId, (int) $feature->credit_tariff);
            if (in_array($featureCode, ['resume_analyze', 'resume_rewrite'], true)) {
                DB::table('ai_resume_consents')->insert([
                    'user_id' => $user->id, 'resume_id' => $context['subject_id'],
                    'request_id' => $requestId, 'consent_version' => 'ai-resume-v1',
                    'granted_at' => now(),
                ]);
            }
            DB::afterCommit(fn () => ExecuteAiRequest::dispatch($requestId)
                ->onQueue(config('pm-ai.queue')));
            return $this->receipt(DB::table('ai_requests')->where('id', $requestId)->first());
        }, 3);
    }

    private function conversation(User $user, string $feature, array $context, array $input): ?int
    {
        if (! $this->catalog->isChat($feature)) {
            return null;
        }
        if (str_starts_with($feature, 'pmp_')) {
            $existing = DB::table('ai_exam_contexts')->where('user_id', $user->id)
                ->where('attempt_id', $context['attempt_id'])
                ->where('question_id', $context['question_id'])->first();
            if ($existing) {
                $conversationId = (int) $existing->conversation_id;
                if (! DB::table('ai_conversations')->where('id', $conversationId)
                    ->where('user_id', $user->id)->where('status', 'active')->exists()) {
                    throw new AiFailure('CONVERSATION_CLOSED', 409);
                }
            } else {
                $conversationId = DB::table('ai_conversations')->insertGetId([
                    'user_id' => $user->id, 'feature_scope' => 'feature:pmp',
                    'subject_type' => 'pmp_attempt_question', 'subject_id' => $context['question_id'],
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('ai_exam_contexts')->insert([
                    'conversation_id' => $conversationId, 'user_id' => $user->id,
                    'attempt_id' => $context['attempt_id'], 'question_id' => $context['question_id'],
                ]);
            }
            if ($feature === 'pmp_explain' && DB::table('ai_requests')
                ->where('conversation_id', $conversationId)
                ->where('feature_code', 'pmp_explain')
                ->whereIn('status', ['queued', 'running', 'provider_status_unknown'])->exists()) {
                throw new AiFailure('ALREADY_RUNNING', 409);
            }
            // Keep one in-flight question turn at a time. This guarantees ordered
            // context and prevents simultaneous tabs racing the conversation history.
            if ($feature === 'pmp_followup' && DB::table('ai_requests')
                ->where('conversation_id', $conversationId)
                ->whereIn('status', ['queued', 'running', 'provider_status_unknown'])->exists()) {
                throw new AiFailure('ALREADY_RUNNING', 409);
            }
            if ($feature === 'pmp_followup') {
                $previous = DB::table('ai_requests')->where('conversation_id', $conversationId)
                    ->where('status', 'completed')->where('feature_code', 'pmp_explain')->exists();
                if (! $previous || empty(trim((string) ($input['message'] ?? '')))) {
                    throw new AiFailure('FIRST_EXPLANATION_REQUIRED', 409);
                }
            } elseif (DB::table('ai_requests')->where('conversation_id', $conversationId)
                ->where('feature_code', 'pmp_explain')->where('status', 'completed')->exists()) {
                // Saved first explanations are retrievable without a new charge/chat slot.
                throw new AiFailure('EXPLANATION_ALREADY_AVAILABLE', 409);
            }
            return $conversationId;
        }
        $conversationId = (int) ($input['conversation_id'] ?? 0);
        if ($conversationId) {
            $valid = DB::table('ai_conversations')->where('id', $conversationId)
                ->where('user_id', $user->id)->where('status', 'active')
                ->where('feature_scope', $this->catalog->family($feature))->exists();
            if (! $valid) {
                throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
            }
            return $conversationId;
        }
        return DB::table('ai_conversations')->insertGetId([
            'user_id' => $user->id, 'feature_scope' => $this->catalog->family($feature),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function receipt(object $request): array
    {
        return ['request_id' => $request->request_uuid, 'feature' => $request->feature_code,
            'status' => $request->status, 'credits_reserved' => (int) $request->estimated_hold,
            'credits_charged' => (int) $request->final_charge,
            'status_url' => '/ai/requests/'.$request->request_uuid,
            'conversation_id' => $request->conversation_id];
    }

    /** Staff-generated editorial requests have no member wallet or chat quota. */
    public function submitEditorial(string $feature, int $draftId, array $context): array
    {
        if (! in_array($feature, ['scenario_generate', 'trend_draft'], true)
            || ! config('pm-ai.editorial_enabled')) {
            throw new AiFailure('FEATURE_DISABLED', 503);
        }
        $settings = $this->catalog->get($feature);
        $prompt = DB::table('ai_prompt_versions')->where('feature_code', $feature)
            ->where('version', $settings->prompt_version)->whereNotNull('published_at')->first();
        $price = DB::table('ai_model_prices')->where('model', $settings->model)
            ->where('effective_from', '<=', now())->orderByDesc('effective_from')->first();
        if (! $prompt || ! $price || ! config('pm-ai.api_key')) {
            throw new AiFailure('EDITORIAL_NOT_CONFIGURED', 503);
        }
        return DB::transaction(function () use ($feature, $draftId, $context, $settings, $prompt, $price): array {
            $requestId = DB::table('ai_requests')->insertGetId([
                'request_uuid' => (string) Str::uuid(), 'feature_code' => $feature,
            'subject_type' => 'editorial_draft', 'subject_id' => $draftId,
            'status' => 'queued', 'model' => $settings->model,
            'prompt_version' => $settings->prompt_version,
            'max_output_tokens' => $settings->max_output_tokens, 'estimated_hold' => 0,
            'payload_encrypted' => Crypt::encryptString(json_encode([
                'context' => ['context' => $context, 'message' => null],
                'instructions' => $prompt->template,
            ], JSON_THROW_ON_ERROR)),
            'model_price_snapshot' => json_encode(['input' => $price->input_usd_per_m,
                'cached' => $price->cached_input_usd_per_m, 'output' => $price->output_usd_per_m,
                'price_id' => $price->id]),
            'lease_until' => now()->addSeconds((int) config('pm-ai.lease_seconds')),
            'created_at' => now(), 'updated_at' => now(),
        ]);
            $this->budget->reserve($requestId, $feature, $context, [
                'input' => $price->input_usd_per_m, 'cached' => $price->cached_input_usd_per_m,
                'output' => $price->output_usd_per_m], (int) $settings->max_output_tokens);
            DB::table('ai_editorial_drafts')->where('id', $draftId)->update(['request_id' => $requestId]);
            DB::afterCommit(fn () => ExecuteAiRequest::dispatch($requestId)
            ->onQueue(config('pm-ai.editorial_queue')));
            return $this->receipt(DB::table('ai_requests')->where('id', $requestId)->first());
        }, 3);
    }
}
