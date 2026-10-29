<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('learning_paths', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('level', 80);
            $table->string('title', 180);
            $table->text('summary');
            $table->text('introduction');
            $table->json('objectives');
            $table->unsignedTinyInteger('position');
            $table->string('access_tier', 16)->default('free');
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
        Schema::create('learning_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_path_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('position');
            $table->string('title', 180);
            $table->text('summary');
            $table->unsignedSmallInteger('minutes')->default(30);
            $table->timestamps();
            $table->unique(['learning_path_id', 'position']);
        });
        Schema::create('learning_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_module_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('position');
            $table->string('type', 24);
            $table->string('title', 180);
            $table->text('content');
            $table->json('payload')->nullable();
            $table->unsignedTinyInteger('minutes')->default(5);
            $table->timestamps();
            $table->unique(['learning_module_id', 'position']);
        });
        Schema::create('learning_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_activity_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('position');
            $table->text('prompt');
            $table->json('choices');
            $table->string('answer_key', 1);
            $table->text('explanation');
            $table->timestamps();
            $table->unique(['learning_activity_id', 'position']);
        });
        Schema::create('learning_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('learning_question_id')->constrained()->cascadeOnDelete();
            $table->string('answer_key', 1);
            $table->boolean('is_correct');
            $table->timestamps();
            $table->unique(['user_id', 'learning_question_id']);
        });
        Schema::create('learning_activity_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('learning_activity_id')->constrained()->cascadeOnDelete();
            $table->text('written_response')->nullable();
            $table->timestamp('completed_at');
            $table->timestamps();
            $table->unique(['user_id', 'learning_activity_id'], 'learning_completion_once');
        });
        Schema::create('learning_path_saves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('learning_path_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'learning_path_id']);
        });
    }

    public function down(): void
    {
        foreach (['learning_path_saves', 'learning_activity_completions', 'learning_answers', 'learning_questions', 'learning_activities', 'learning_modules', 'learning_paths'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
