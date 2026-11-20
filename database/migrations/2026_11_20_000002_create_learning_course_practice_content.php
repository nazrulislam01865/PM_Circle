<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('learning_courses', function (Blueprint $table): void {
            $table->unsignedSmallInteger('practice_question_count')->default(10);
            $table->unsignedSmallInteger('practice_duration_minutes')->default(15);
            $table->boolean('practice_enabled')->default(false);
        });

        Schema::create('learning_course_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('learning_courses');
            $table->string('code', 70);
            $table->string('section_title', 200);
            $table->string('topic_title', 200);
            $table->string('kind', 20)->default('question');
            $table->string('difficulty', 20)->default('Moderate');
            $table->text('prompt');
            $table->json('options');
            $table->char('correct_option', 1);
            $table->text('explanation')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->unique(['course_id', 'code']);
            $table->index(['course_id', 'is_published', 'section_title']);
        });

        Schema::create('learning_course_resources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('learning_courses');
            $table->string('title', 200);
            $table->string('section_title', 200);
            $table->text('description')->nullable();
            $table->string('kind', 10);
            $table->text('url')->nullable();
            $table->string('file_path')->nullable();
            $table->string('original_name')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->index(['course_id', 'is_published', 'section_title']);
        });

        Schema::create('learning_course_practice_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('learning_courses');
            $table->foreignId('user_id')->constrained('users');
            $table->string('section_title', 200)->nullable();
            $table->json('questions'); // Frozen question keys and explanations for deterministic scoring.
            $table->json('answers')->nullable();
            $table->string('status', 12)->default('started');
            $table->unsignedSmallInteger('score')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('expires_at');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'course_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_course_practice_attempts');
        Schema::dropIfExists('learning_course_resources');
        Schema::dropIfExists('learning_course_questions');
        Schema::table('learning_courses', function (Blueprint $table): void {
            $table->dropColumn(['practice_question_count', 'practice_duration_minutes', 'practice_enabled']);
        });
    }
};
