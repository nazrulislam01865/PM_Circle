<?php

namespace Database\Seeders;

use App\Models\MasterDataOption;
use App\Models\HomePageContent;
use Illuminate\Database\Seeder;

/** Creates only missing options; never overrides administrator labels, ordering or activation. */
final class HomepageMasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            'hero_primary_url' => ['/register', '/discover-pm', '/learning', '/community', '/careers', '/dashboard'],
            'hero_secondary_url' => ['/community', '/daily-challenge', '/discover-pm', '/learning', '/careers', '/pm-trends'],
            'pathway_step_icon' => ['direction', 'learn', 'exams', 'skills', 'community'],
            'pathway_exam_icon' => ['pmp', 'scrum', 'simulation'],
            'skills_url' => ['/learning', '/community', '/careers'],
            'skills_icon' => ['practice', 'scrum', 'simulation'],
            'careers_feature_url' => ['/learning', '/community', '/careers'],
            'careers_feature_icon' => ['learn', 'discuss', 'jobs', 'resume'],
            'careers_opportunity_icon' => ['manager', 'analyst', 'scrum'],
            'careers_location' => ['Remote', 'Hybrid', 'On-site'],
            'careers_type' => ['Full time', 'Part time', 'Contract'],
        ];
        // Carry forward any custom location/type already saved with the previous text fields.
        $homepage = HomePageContent::query()->where('key', 'home')->first(['content']);
        foreach ($homepage?->content['careers']['opportunities'] ?? [] as $opportunity) {
            foreach (['location' => 'careers_location', 'type' => 'careers_type'] as $field => $category) {
                $value = $opportunity[$field] ?? null;
                if (is_string($value) && $value !== '' && ! in_array($value, $groups[$category], true)) {
                    $groups[$category][] = $value;
                }
            }
        }

        foreach ($groups as $category => $values) {
            foreach ($values as $index => $value) {
                MasterDataOption::query()->firstOrCreate(
                    ['category' => $category, 'value' => $value],
                    ['label' => $value, 'sort_order' => ($index + 1) * 10, 'is_active' => true],
                );
            }
        }
    }
}
