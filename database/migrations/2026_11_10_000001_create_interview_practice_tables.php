<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('interview_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('industry', 40);
            $table->string('role', 70);
            $table->string('experience', 30);
            $table->json('question_types');
            $table->string('answer_mode', 12);
            $table->json('questions');
            $table->unsignedSmallInteger('question_count');
            $table->string('status', 16)->default('in_progress');
            $table->decimal('overall_score', 4, 1)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status', 'id']);
            $table->index(['user_id', 'completed_at']);
        });

        Schema::create('interview_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interview_session_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->longText('answer');
            $table->string('mode', 12);
            $table->string('status', 15)->default('pending');
            $table->decimal('score', 4, 1)->nullable();
            $table->json('evaluation')->nullable();
            $table->string('ai_model', 80)->nullable();
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();
            $table->unique(['interview_session_id', 'position']);
            $table->index(['status', 'updated_at']);
        });
        Schema::create('interview_ai_usage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('interview_session_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->string('model', 80);
            $table->unsignedInteger('input_tokens');
            $table->unsignedInteger('output_tokens');
            $table->decimal('estimated_cost_usd', 12, 6)->default(0);
            $table->timestamp('created_at');
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interview_ai_usage');
        Schema::dropIfExists('interview_answers');
        Schema::dropIfExists('interview_sessions');
    }
};
