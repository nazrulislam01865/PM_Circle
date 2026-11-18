<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table): void {
            // NULL means a legacy approved comment: no retroactive hiding or data migration.
            $table->string('check_status', 20)->nullable();
            $table->string('check_reason', 500)->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->index(['post_id', 'check_status', 'parent_id'], 'comments_check_visible_idx');
            $table->index(['author_id', 'created_at'], 'comments_author_recent_idx');
        });
        Schema::create('comment_check_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('comment_id')->unique()->constrained('comments')->cascadeOnDelete();
            $table->string('status', 20)->default('queued');
            $table->string('model', 40)->default('gpt-5-nano');
            $table->string('error_code', 40)->nullable();
            $table->unsignedInteger('input_tokens')->nullable();
            $table->unsignedInteger('output_tokens')->nullable();
            $table->decimal('cost_usd', 12, 8)->nullable();
            $table->timestamps();
            $table->index(['created_at', 'status']);
        });
        Schema::create('comment_check_violations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('comment_id')->unique()->constrained('comments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('category', 24);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_check_violations');
        Schema::dropIfExists('comment_check_runs');
        Schema::table('comments', function (Blueprint $table): void {
            $table->dropIndex('comments_check_visible_idx');
            $table->dropIndex('comments_author_recent_idx');
            $table->dropColumn(['check_status', 'check_reason', 'checked_at']);
        });
    }
};
