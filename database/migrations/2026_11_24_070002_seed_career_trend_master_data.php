<?php

use App\Domain\Careers\Services\CareerTrendSettings;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['topics' => 'career_trend_topic', 'target_levels' => 'career_trend_target_level'] as $field => $category) {
            $order = 0;
            foreach (CareerTrendSettings::OPTIONS[$field] as $value => $label) {
                DB::table('master_data_options')->insertOrIgnore([
                    'category' => $category, 'value' => $value, 'label' => $label,
                    'sort_order' => $order += 10, 'is_active' => true,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Preserve administrator-managed master data on rollback.
    }
};
