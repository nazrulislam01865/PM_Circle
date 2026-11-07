<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // PostgreSQL concurrent index creation must not run in a transaction.
    public $withinTransaction = false;

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement(<<<'SQL'
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_public_recent_v1
            ON posts (published_at DESC, id DESC)
            WHERE status = 'published' AND visibility = 'public'
              AND deleted_at IS NULL AND published_at IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_posts_public_recent_v1');
        }
    }
};
