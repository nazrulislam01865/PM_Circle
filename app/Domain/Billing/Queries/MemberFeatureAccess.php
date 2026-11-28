<?php

namespace App\Domain\Billing\Queries;

use App\Domain\AI\Services\AiFeatureCatalog;

final class MemberFeatureAccess
{
    public static function allows(string $plan, string $minimum): bool
    {
        $rank = ['free' => 0, 'plus' => 1, 'pro' => 2];
        return isset($rank[$plan], $rank[$minimum]) && $rank[$plan] >= $rank[$minimum];
    }

    public static function allowsCourse(string $plan, string $tier): bool
    {
        return self::allows($plan, $tier === 'paid' ? 'plus' : $tier);
    }

    public static function interviewCounts(string $plan): array
    {
        return match ($plan) { 'plus' => [5, 10], 'pro' => [5, 10, 20], default => [] };
    }

    public static function allowsExamSimulator(string $plan): bool
    {
        return self::allows($plan, 'plus');
    }

    public static function allowsAi(string $plan, string $feature, string $configuredMinimum): bool
    {
        return self::allows($plan, AiFeatureCatalog::FEATURES[$feature]['min_plan'] ?? 'staff')
            && self::allows($plan, $configuredMinimum);
    }

    public function forPlan(string $plan): array
    {
        $minimum = AiFeatureCatalog::FEATURES['resume_rewrite']['min_plan'];
        return [
            'examSimulator' => self::allowsExamSimulator($plan),
            'pmp' => self::allowsExamSimulator($plan), // Backward-compatible PMP usage projection.
            'resume' => self::allows($plan, 'free'),
            'events' => self::allows($plan, 'plus'),
            'resumeAi' => self::allows($plan, $minimum),
            'interview' => self::allows($plan, 'plus'),
            'achievements' => self::allows($plan, 'plus'),
            'activity' => self::allows($plan, 'plus'),
            'insights' => self::allows($plan, 'plus'),
            'resumeMinimum' => $minimum,
        ];
    }
}
