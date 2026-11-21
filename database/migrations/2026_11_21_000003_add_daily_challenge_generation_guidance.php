<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_challenge_settings', function (Blueprint $table): void {
            $table->string('generation_title_hint', 180)->nullable();
            $table->json('generation_domains')->nullable();
            $table->json('generation_topics')->nullable();
            $table->string('generation_difficulty', 80)->nullable();
            $table->string('generation_approach', 80)->nullable();
            $table->string('generation_notes', 500)->nullable();
        });

        $choices = [
            'daily_challenge_domain' => [
                'People', 'Process', 'Business Environment',
            ],
            'daily_challenge_topic' => [
                'Stakeholder Management', 'Risk Management', 'Scope and Change Control',
                'Schedule Management', 'Cost Management', 'Quality Management',
                'Agile and Scrum', 'Team Leadership', 'Communication', 'Procurement',
                'Resource Management', 'Ethics and Governance',
            ],
            'daily_challenge_difficulty' => ['Beginner', 'Moderate', 'Advanced'],
            'daily_challenge_approach' => ['Predictive', 'Adaptive', 'Hybrid'],
        ];
        $rows = [];
        foreach ($choices as $category => $values) {
            foreach ($values as $index => $value) {
                $rows[] = [
                    'category' => $category, 'value' => $value, 'label' => $value,
                    'sort_order' => ($index + 1) * 10, 'is_active' => true,
                    'created_at' => now(), 'updated_at' => now(),
                ];
            }
        }
        DB::table('master_data_options')->insertOrIgnore($rows);
    }

    public function down(): void
    {
        Schema::table('daily_challenge_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'generation_title_hint', 'generation_domains', 'generation_topics',
                'generation_difficulty', 'generation_approach', 'generation_notes',
            ]);
        });
        // Do not remove editable Master Data values during rollback.
    }
};
