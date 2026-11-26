<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use Illuminate\Support\Facades\DB;

final class AiFeatureCatalog
{
    public const FEATURES = [
        'pmp_explain' => ['family' => 'feature:pmp', 'min_plan' => 'plus', 'chat' => true],
        'pmp_followup' => ['family' => 'feature:pmp', 'min_plan' => 'plus', 'chat' => true],
        'scenario_review' => ['family' => 'feature:scenario', 'min_plan' => 'plus', 'chat' => false],
        'daily_challenge_review' => ['family' => 'feature:daily_challenge', 'min_plan' => 'free', 'chat' => false],
        'scenario_comment_review' => ['family' => 'feature:scenario', 'min_plan' => 'plus', 'chat' => false],
        'ask_ai' => ['family' => 'feature:ask_ai', 'min_plan' => 'plus', 'chat' => true],
        'interview_answer_review' => ['family' => 'feature:interview', 'min_plan' => 'plus', 'chat' => false],
        'resume_analyze' => ['family' => 'feature:resume', 'min_plan' => 'pro', 'chat' => false],
        'resume_rewrite' => ['family' => 'feature:resume', 'min_plan' => 'pro', 'chat' => false],
        'scenario_generate' => ['family' => 'feature:editorial', 'min_plan' => 'staff', 'chat' => false],
        'trend_draft' => ['family' => 'feature:editorial', 'min_plan' => 'staff', 'chat' => false],
    ];

    public function get(string $code): object
    {
        if (! array_key_exists($code, self::FEATURES)) {
            throw new AiFailure('FEATURE_UNAVAILABLE', 404);
        }
        $feature = DB::table('ai_features')->where('code', $code)->first();
        if (! $feature || ! $feature->enabled || ! config('pm-ai.enabled')) {
            throw new AiFailure('FEATURE_DISABLED', 503);
        }
        if (($code !== 'trend_draft' && ! preg_match('/^(?:gpt-|o[1-9])/', $feature->model)) || ! in_array($feature->model, app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), true)) {
            throw new AiFailure('MODEL_NOT_ALLOWLISTED', 503);
        }
        if ($feature->max_output_tokens < 50 || $feature->max_output_tokens > 5000) {
            throw new AiFailure('INVALID_FEATURE_CONFIGURATION', 503);
        }
        return $feature;
    }

    public function isChat(string $code): bool
    {
        return (bool) (self::FEATURES[$code]['chat'] ?? false);
    }

    public function family(string $code): string
    {
        return self::FEATURES[$code]['family'] ?? 'feature:unknown';
    }

    public function schema(string $feature): array
    {
        $str = fn () => ['type' => 'string'];
        $strings = fn () => ['type' => 'array', 'items' => $str()];
        $optionalText = ['type' => ['string', 'null']];
        $object = fn (array $properties) => ['type' => 'object', 'additionalProperties' => false,
            'required' => array_keys($properties), 'properties' => $properties];

        return match ($feature) {
            'pmp_explain' => $object(['explanation' => $str(), 'nextStep' => $optionalText]),
            'pmp_followup' => $object(['answer' => $str(), 'nextStep' => $optionalText]),
            'ask_ai' => $object(['answer' => $str(), 'nextStep' => $str()]),
            'scenario_review', 'scenario_comment_review', 'daily_challenge_review' => $object([
                'criteria' => ['type' => 'array', 'items' => $object(['key' => $str(),
                    'points' => ['type' => 'integer'], 'evidence' => $str()])],
                'strengths' => $strings(), 'gaps' => $strings(), 'next_actions' => $strings(),
                'disclaimer' => $str(),
            ]),
            'interview_answer_review' => $object(['summary' => $str(), 'strengths' => $strings(), 'improvements' => $strings(), 'suggested_answer' => $str()]),
            'resume_analyze' => $object(['strengths' => $strings(), 'improvements' => $strings(),
                'role_alignment' => $str(), 'disclaimer' => $str()]),
            'resume_rewrite' => $object(['suggested_text' => $str(), 'reason' => $str()]),
            'scenario_generate' => $object(['title' => $str(), 'summary' => $str(),
                'situation' => $str(), 'known_facts' => $strings(), 'topics' => $strings(),
                'difficulty' => $str(), 'focus' => $str(), 'learner_prompt' => $str(),
                'rubric_criteria' => ['type' => 'array', 'items' => $object([
                    'key' => $str(), 'description' => $str(), 'max_points' => ['type' => 'integer'],
                ])]]),
            'trend_draft' => $object(['title' => $str(), 'summary' => $str(),
                'body_markdown' => $str(), 'source_urls' => $strings()]),
            default => throw new AiFailure('FEATURE_UNAVAILABLE', 404),
        };
    }

    public function validate(string $feature, array $result, ?array $rubric = null): array
    {
        $this->validateShape($result, $this->schema($feature));
        if ($feature === 'interview_answer_review') {
            foreach (['strengths', 'improvements'] as $field) {
                if (count($result[$field]) < 1 || count($result[$field]) > 5 || collect($result[$field])->contains(fn ($item) => mb_strlen($item) > 500)) {
                    throw new AiFailure('INVALID_AI_RESPONSE', 503);
                }
            }
            if (mb_strlen($result['summary']) > 1500 || mb_strlen($result['suggested_answer']) > 4000) throw new AiFailure('INVALID_AI_RESPONSE', 503);
        }
        if ($feature === 'scenario_generate') {
            $criteria = $result['rubric_criteria'];
            $keys = array_column($criteria, 'key');
            if (count($criteria) < 2 || count($criteria) > 5
                || count(array_unique($keys)) !== count($keys)
                || count($result['known_facts']) < 2 || count($result['known_facts']) > 8
                || count($result['topics']) < 1 || count($result['topics']) > 5
                || mb_strlen($result['title']) > 180 || mb_strlen($result['summary']) > 1500
                || mb_strlen($result['situation']) > 6000 || mb_strlen($result['learner_prompt']) > 1500
                || array_sum(array_column($criteria, 'max_points')) !== 10) {
                throw new AiFailure('INVALID_AI_RESPONSE', 503);
            }
            foreach ($criteria as $criterion) {
                if (! preg_match('/^[a-z][a-z0-9_]{0,59}$/', $criterion['key'])
                    || $criterion['max_points'] < 1 || $criterion['max_points'] > 10
                    || mb_strlen($criterion['description']) > 500) {
                    throw new AiFailure('INVALID_AI_RESPONSE', 503);
                }
            }
        }
        if (in_array($feature, ['scenario_review', 'scenario_comment_review', 'daily_challenge_review'], true)) {
            if (! $rubric || ! is_array($rubric['criteria'] ?? null)) {
                throw new AiFailure('RUBRIC_MISSING', 422);
            }
            $allowed = collect($rubric['criteria'])->keyBy('key');
            if (count($result['criteria']) !== $allowed->count()) {
                throw new AiFailure('INVALID_AI_RESPONSE', 503);
            }
            $seen = [];
            $sum = 0;
            foreach ($result['criteria'] as $criterion) {
                $key = $criterion['key'];
                $limit = $allowed->get($key);
                if (! $limit || isset($seen[$key]) || $criterion['points'] < 0
                    || $criterion['points'] > (int) $limit['max_points']
                    || trim($criterion['evidence']) === '') {
                    throw new AiFailure('INVALID_AI_RESPONSE', 503);
                }
                $seen[$key] = true;
                $sum += $criterion['points'];
            }
            if ($feature === 'daily_challenge_review' && (int) ($rubric['max_score'] ?? -1) !== 10) {
                throw new AiFailure('INVALID_RUBRIC', 503);
            }
            $result['total_score'] = $sum; // Deterministic Laravel sum; never model-authored score.
        }
        return $result;
    }

    private function validateShape(mixed $value, array $schema, int $depth = 0): void
    {
        if ($depth > 8) {
            throw new AiFailure('INVALID_AI_RESPONSE', 503);
        }
        $type = $schema['type'];
        if (is_array($type)) {
            if ($value === null && in_array('null', $type, true)) {
                return;
            }
            $type = 'string';
        }
        if ($type === 'object') {
            if (! is_array($value) || array_is_list($value) || array_keys($value) !== array_keys($schema['properties'])) {
                // Order is not significant for JSON objects.
                if (! is_array($value) || array_is_list($value)
                    || array_diff(array_keys($schema['properties']), array_keys($value))
                    || array_diff(array_keys($value), array_keys($schema['properties']))) {
                    throw new AiFailure('INVALID_AI_RESPONSE', 503);
                }
            }
            foreach ($schema['properties'] as $key => $child) {
                $this->validateShape($value[$key], $child, $depth + 1);
            }
        } elseif ($type === 'array') {
            if (! is_array($value) || ! array_is_list($value) || count($value) > 40) {
                throw new AiFailure('INVALID_AI_RESPONSE', 503);
            }
            foreach ($value as $item) {
                $this->validateShape($item, $schema['items'], $depth + 1);
            }
        } elseif ($type === 'string') {
            if (! is_string($value) || trim($value) === '' || mb_strlen($value) > 12000) {
                throw new AiFailure('INVALID_AI_RESPONSE', 503);
            }
        } elseif ($type === 'integer' && ! is_int($value)) {
            throw new AiFailure('INVALID_AI_RESPONSE', 503);
        }
    }
}
