<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pmp_exam_questions', function (Blueprint $table): void {
            $table->string('eco_task_id', 24)->nullable();
            $table->string('eco_task_focus', 255)->nullable();
            $table->string('approach', 40)->nullable();
            $table->json('option_rationales')->nullable();
            $table->string('pmbok_performance_domain', 150)->nullable();
            $table->string('legacy_knowledge_area', 150)->nullable();
            $table->string('industry', 120)->nullable();
            $table->string('question_type', 40)->default('Single Select');
            $table->string('reference_publication', 255)->nullable();
            $table->string('reference_section', 100)->nullable();
            $table->string('reference_heading', 255)->nullable();
            $table->unsignedSmallInteger('reference_pdf_page')->nullable();
            $table->string('eco_reference', 350)->nullable();
            // Existing published questions remain usable; new workbook drafts remain inactive.
            $table->string('review_status', 40)->default('Approved');
        });

        Schema::table('pmp_exam_attempts', function (Blueprint $table): void {
            $table->index(['user_id', 'mode', 'status', 'finished_at'], 'pmp_attempt_user_mode_status_finished_idx');
        });
    }

    public function down(): void
    {
        Schema::table('pmp_exam_attempts', function (Blueprint $table): void {
            $table->dropIndex('pmp_attempt_user_mode_status_finished_idx');
        });
        Schema::table('pmp_exam_questions', function (Blueprint $table): void {
            $table->dropColumn([
                'eco_task_id', 'eco_task_focus', 'approach', 'option_rationales',
                'pmbok_performance_domain', 'legacy_knowledge_area', 'industry',
                'question_type', 'reference_publication', 'reference_section',
                'reference_heading', 'reference_pdf_page', 'eco_reference', 'review_status',
            ]);
        });
    }
};
