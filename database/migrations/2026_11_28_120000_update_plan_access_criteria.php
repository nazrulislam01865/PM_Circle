<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Support\Admin\PublicPageContent;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $record = DB::table('home_page_contents')->where('key', PublicPageContent::key('compare-plans'))->lockForUpdate()->first();
            if ($record) {
                $content = json_decode($record->content, true, 512, JSON_THROW_ON_ERROR);
                $defaults = PublicPageContent::defaults('compare-plans');
                foreach (['community', 'learning', 'exams', 'career', 'ai-support', 'notes', 'profile-import'] as $section) {
                    $content[$section] = $defaults[$section];
                }
                DB::table('home_page_contents')->where('id', $record->id)->update(['content' => json_encode($content, JSON_THROW_ON_ERROR), 'revision' => $record->revision + 1, 'updated_at' => now()]);
            }
            DB::table('master_data_options')->insertOrIgnore(['category' => 'course_access', 'value' => 'pro', 'label' => 'Pro only', 'sort_order' => 30, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('ai_features')->where('code', 'resume_rewrite')->where('min_plan', 'pro')->update(['min_plan' => 'plus', 'updated_at' => now()]);
        });
        PublicPageContent::clear('compare-plans');
    }

    public function down(): void
    {
        // Do not discard subsequent administrator edits, course assignments or user data.
    }
};
