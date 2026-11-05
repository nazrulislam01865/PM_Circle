<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->jsonb('tags')->nullable()->default('[]');
            $table->unsignedInteger('claps_count')->default(0);
        });

        Schema::table('scenario_responses', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->constrained('scenario_responses')->cascadeOnDelete();
            $table->boolean('is_community_helpful')->default(false);
            $table->boolean('is_question')->default(false);
            $table->unsignedTinyInteger('ai_score')->nullable();
            $table->jsonb('ai_feedback')->nullable();
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('loves_count')->default(0);
        });

        Schema::create('scenario_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('scenario_id')->constrained('scenarios')->cascadeOnDelete();
            $table->string('type', 20); // like, love, save
            $table->timestamps();
            $table->unique(['user_id', 'scenario_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scenario_reactions');

        Schema::table('scenario_responses', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn(['parent_id', 'is_community_helpful', 'is_question', 'ai_score', 'ai_feedback', 'likes_count', 'loves_count']);
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['tags', 'claps_count']);
        });
    }
};

