<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_course_questions', function (Blueprint $table): void {
            $table->uuid('lesson_uid')->nullable();
            $table->text('scenario_text')->nullable();
            $table->text('scenario_video_url')->nullable();
            $table->index(['course_id', 'lesson_uid', 'is_published'], 'course_lesson_question_lookup');
        });
        Schema::create('learning_catalog_settings', function (Blueprint $table): void {
            $table->unsignedSmallInteger('id')->primary();
            $table->json('content');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('learning_catalog_settings');
        Schema::table('learning_course_questions', function (Blueprint $table): void {
            $table->dropIndex('course_lesson_question_lookup');
            $table->dropColumn(['lesson_uid', 'scenario_text', 'scenario_video_url']);
        });
    }
};
