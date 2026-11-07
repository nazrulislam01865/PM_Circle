<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pmp_exam_questions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 70)->unique();
            $table->string('domain', 40);
            $table->string('difficulty', 20)->default('Moderate');
            $table->text('prompt');
            $table->json('options');
            $table->char('correct_option', 1);
            $table->text('explanation');
            $table->text('other_options')->nullable();
            $table->text('takeaway')->nullable();
            $table->text('concepts')->nullable();
            $table->text('references')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['is_active', 'id']);
        });

        Schema::create('pmp_exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('in_progress');
            $table->json('question_ids'); // Immutable question selection for this attempt.
            $table->unsignedSmallInteger('total_questions');
            $table->unsignedSmallInteger('correct_count')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('expires_at');
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status', 'created_at']);
        });

        Schema::create('pmp_exam_attempt_answers', function (Blueprint $table) {
            $table->foreignId('attempt_id')->constrained('pmp_exam_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('pmp_exam_questions')->restrictOnDelete();
            $table->char('choice', 1)->nullable();
            $table->boolean('marked_for_review')->default(false);
            $table->timestamps();
            $table->primary(['attempt_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pmp_exam_attempt_answers');
        Schema::dropIfExists('pmp_exam_attempts');
        Schema::dropIfExists('pmp_exam_questions');
    }
};
