<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedTinyInteger('onboarding_step')->default(1);
            $table->string('status', 24)->default('active');
            $table->string('accepted_terms_version', 32)->nullable();
            $table->string('accepted_privacy_version', 32)->nullable();
            $table->timestamp('legal_accepted_at')->nullable();
        });

        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('role', 80)->nullable();
            $table->unsignedSmallInteger('years_experience')->nullable();
            $table->string('headline', 180)->nullable();
            $table->text('bio')->nullable();
            $table->string('visibility', 20)->default('public');
            $table->string('resume_path')->nullable();
            $table->string('resume_scan_status', 24)->nullable();
            $table->timestamps();
        });

        Schema::create('certifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('credential_number', 120)->nullable();
            $table->boolean('verified')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'name']);
        });

        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('code', 16)->unique();
            $table->string('name', 40);
            $table->boolean('active')->default(true);
            $table->json('benefits')->nullable();
            $table->timestamps();
        });

        Schema::create('plan_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('months');
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('BDT');
            $table->unsignedInteger('version')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['plan_id', 'months', 'version']);
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_price_id')->constrained()->restrictOnDelete();
            $table->string('status', 32);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('cancel_at_term_end')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'status', 'ends_at']);
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 180)->nullable();
            $table->text('body');
            $table->string('topic', 60)->default('From my project');
            $table->string('visibility', 24)->default('public');
            $table->string('status', 24)->default('published');
            $table->boolean('ai_generated')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'visibility', 'published_at']);
            $table->index(['author_id', 'published_at']);
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['post_id', 'created_at']);
        });

        Schema::create('post_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 12);
            $table->timestamps();
            $table->unique(['post_id', 'user_id']);
        });

        Schema::create('post_saves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['post_id', 'user_id']);
        });

        Schema::create('scenarios', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title', 180);
            $table->text('summary');
            $table->text('situation');
            $table->json('known_facts');
            $table->json('topics');
            $table->string('difficulty', 32)->default('Intermediate');
            $table->string('focus', 80);
            $table->unsignedTinyInteger('minutes')->default(10);
            $table->string('status', 24)->default('draft');
            $table->unsignedSmallInteger('rubric_version')->default(1);
            $table->boolean('ai_generated')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'published_at']);
        });

        Schema::create('scenario_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scenario_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->index(['scenario_id', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['scenario_responses', 'scenarios', 'post_saves', 'post_reactions', 'comments', 'posts', 'subscriptions', 'plan_prices', 'plans', 'certifications', 'profiles'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['onboarding_step', 'status', 'accepted_terms_version', 'accepted_privacy_version', 'legal_accepted_at']);
        });
    }
};
