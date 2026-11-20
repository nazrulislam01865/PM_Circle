<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Add course dropdown choices without altering or deleting any existing master data. */
return new class extends Migration
{
    public function up(): void
    {
        $groups = [
            'course_category' => [
                'Project Management' => 'Project Management',
                'Agile & Scrum' => 'Agile & Scrum',
                'PMP Certification' => 'PMP Certification',
                'Planning & Scheduling' => 'Planning & Scheduling',
                'Stakeholder & Communication' => 'Stakeholder & Communication',
                'Risk & Change' => 'Risk & Change',
                'Leadership & Strategy' => 'Leadership & Strategy',
            ],
            'course_level' => ['Beginner' => 'Beginner', 'Intermediate' => 'Intermediate', 'Advanced' => 'Advanced'],
            'course_access' => ['free' => 'Free members', 'paid' => 'Plus & Pro included'],
            'course_question_kind' => ['question' => 'Standard question', 'scenario' => 'Scenario-based question'],
            'course_question_difficulty' => ['Easy' => 'Easy', 'Moderate' => 'Moderate', 'Hard' => 'Hard'],
            'course_resource_kind' => ['file' => 'Upload document', 'link' => 'External HTTPS link'],
        ];
        // Preserve custom categories and levels that already exist in the live catalog.
        foreach (['category' => 'course_category', 'level' => 'course_level'] as $column => $group) {
            foreach (DB::table('learning_courses')->distinct()->pluck($column) as $value) {
                if (is_string($value) && $value !== '' && ! array_key_exists($value, $groups[$group])) {
                    $groups[$group][$value] = $value;
                }
            }
        }
        $now = now();
        $rows = [];
        foreach ($groups as $category => $choices) {
            $position = 0;
            foreach ($choices as $value => $label) {
                $rows[] = [
                    'category' => $category, 'value' => $value, 'label' => $label,
                    'sort_order' => (++$position) * 10, 'is_active' => true,
                    'created_at' => $now, 'updated_at' => $now,
                ];
            }
        }
        DB::table('master_data_options')->insertOrIgnore($rows);
    }

    public function down(): void
    {
        // Configuration records may be edited by admins. Rollback must not remove them.
    }
};
