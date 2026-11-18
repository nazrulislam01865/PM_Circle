<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->unsignedInteger('check_version')->default(0);
            $table->string('check_category', 24)->nullable();
            $table->string('check_target', 12)->nullable();
            $table->string('check_reason', 500)->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamp('restricted_at')->nullable();
            $table->index(['author_id', 'status', 'created_at'], 'posts_author_check_idx');
        });

        Schema::create('post_check_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->unsignedInteger('check_version');
            $table->string('status', 20)->default('queued');
            $table->string('model', 40)->default('gpt-5-nano');
            $table->string('error_code', 40)->nullable();
            $table->unsignedInteger('input_tokens')->nullable();
            $table->unsignedInteger('output_tokens')->nullable();
            $table->decimal('cost_usd', 12, 8)->nullable();
            $table->timestamps();
            $table->unique(['post_id', 'check_version']);
            $table->index(['created_at', 'status']);
        });

        Schema::create('post_check_violations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('check_version');
            $table->string('category', 24);
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['post_id', 'check_version']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('post_check_restrictions', function (Blueprint $table): void {
            $table->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->timestamp('blocked_until');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_check_restrictions');
        Schema::dropIfExists('post_check_violations');
        Schema::dropIfExists('post_check_runs');
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropIndex('posts_author_check_idx');
            $table->dropColumn(['check_version', 'check_category', 'check_target', 'check_reason', 'checked_at', 'restricted_at']);
        });
    }
};
