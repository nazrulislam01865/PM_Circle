<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // PostgreSQL CREATE INDEX CONCURRENTLY must not run inside a transaction.
    public $withinTransaction = false;

    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pm_comments_root_active ON comments (post_id, created_at DESC, id DESC) WHERE parent_id IS NULL AND deleted_at IS NULL');
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pm_comments_replies_active ON comments (parent_id, created_at ASC, id ASC) WHERE parent_id IS NOT NULL AND deleted_at IS NULL');
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pm_post_reactions_viewer ON post_reactions (user_id, post_id)');
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pm_comment_likes_viewer ON comment_likes (user_id, comment_id)');
            return;
        }

        // Keep the test database able to exercise the same access patterns.
        Schema::table('comments', function (Blueprint $table): void {
            $table->index(['post_id', 'parent_id', 'created_at', 'id'], 'idx_pm_comments_root_active');
            $table->index(['parent_id', 'created_at', 'id'], 'idx_pm_comments_replies_active');
        });
        Schema::table('post_reactions', fn (Blueprint $table) => $table->index(['user_id', 'post_id'], 'idx_pm_post_reactions_viewer'));
        Schema::table('comment_likes', fn (Blueprint $table) => $table->index(['user_id', 'comment_id'], 'idx_pm_comment_likes_viewer'));
    }

    public function down(): void
    {
        // Preserve safe, useful production indexes rather than block the table on rollback.
    }
};
