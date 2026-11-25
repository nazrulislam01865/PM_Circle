<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('learning_course_lesson_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('learning_courses')->cascadeOnDelete();
            $table->string('lesson_key', 64);
            $table->text('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'course_id', 'lesson_key'], 'learning_lesson_progress_unique');
        });
        Schema::create('learning_course_certificates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('learning_courses')->cascadeOnDelete();
            $table->uuid('reference')->unique();
            $table->string('member_name');
            $table->string('course_title');
            $table->timestamp('issued_at');
            $table->unique(['user_id', 'course_id'], 'learning_course_certificate_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_course_certificates');
        Schema::dropIfExists('learning_course_lesson_progress');
    }
};
