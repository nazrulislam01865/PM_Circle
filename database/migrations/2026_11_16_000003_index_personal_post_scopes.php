<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** PostgreSQL: use concurrent indexes to avoid blocking live writes. */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }
        DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS post_saves_user_post_idx ON post_saves (user_id, post_id)');
        DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS post_hides_user_post_idx ON post_hides (user_id, post_id)');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS post_saves_user_post_idx');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS post_hides_user_post_idx');
    }
};
