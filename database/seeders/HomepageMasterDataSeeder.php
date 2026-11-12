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
            'header_menu' => [
                '/daily-challenge' => 'Daily Challenge', '/community' => 'Community Feed',
                '/learning' => 'Learn & Practice', '/careers' => 'Careers',
                '/members' => 'Members', '/pm-trends' => 'PM Trends',
            ],
            'footer_menu' => [
                '/about' => 'About', '/community' => 'Community guidelines',
                '/privacy' => 'Privacy', '/terms' => 'Terms',
            ],
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
            // Menu entries are an initial default set; do not recreate an old URL after an admin edits it.
            if (in_array($category, ['header_menu', 'footer_menu'], true)
                && MasterDataOption::query()->where('category', $category)->exists()) {
                continue;
            }
            foreach ($values as $index => $item) {
                $position = array_search($index, array_keys($values), true);
                $value = is_string($index) ? $index : $item;
                $label = is_string($index) ? $item : $value;
                MasterDataOption::query()->firstOrCreate(
                    ['category' => $category, 'value' => $value],
                    ['label' => $label, 'sort_order' => ($position + 1) * 10, 'is_active' => true],
                );
            }
        }
        \App\Support\Admin\SiteNavigation::clearCache();
    }
}
