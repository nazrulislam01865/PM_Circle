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
        $minimum = AiFeatureCatalog::FEATURES['resume_analyze']['min_plan']; // Both existing resume operations require Pro in the approved catalog.
        return [
            'examSimulator' => self::allowsExamSimulator($plan),
            'pmp' => self::allowsExamSimulator($plan), // Backward-compatible PMP usage projection.
            'resume' => self::allows($plan, $minimum),
            'resumeMinimum' => $minimum,
        ];
    }
}
