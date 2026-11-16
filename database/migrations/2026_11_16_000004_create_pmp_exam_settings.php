<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pmp_exam_questions', function (Blueprint $table): void {
            $table->index(['is_active', 'domain', 'id'], 'pmp_question_active_domain_id_idx');
        });

        Schema::create('pmp_exam_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->boolean('enabled')->default(true);
            $table->unsignedSmallInteger('full_question_count')->default(180);
            $table->unsignedSmallInteger('full_duration_minutes')->default(230);
            $table->unsignedSmallInteger('focused_question_count')->default(15);
            $table->unsignedSmallInteger('focused_duration_minutes')->default(30);
            $table->boolean('shuffle_questions')->default(true);
            $table->unsignedTinyInteger('needs_improvement_below')->default(25);
            $table->unsignedTinyInteger('target_below')->default(70);
            $table->unsignedTinyInteger('above_target_from')->default(85);
            $table->unsignedSmallInteger('sample_duration_seconds')->default(90);
            $table->foreignId('sample_question_id')->nullable()->constrained('pmp_exam_questions')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('pmp_exam_attempts', function (Blueprint $table): void {
            $table->string('mode', 20)->nullable();
            $table->json('rules_snapshot')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('pmp_exam_attempts', function (Blueprint $table): void {
            $table->dropColumn(['mode', 'rules_snapshot']);
        });
        Schema::dropIfExists('pmp_exam_settings');
        Schema::table('pmp_exam_questions', function (Blueprint $table): void {
            $table->dropIndex('pmp_question_active_domain_id_idx');
        });
    }
};
