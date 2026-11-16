<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Prevent a blocking index build on an existing production reaction table.
    public $withinTransaction = false;

    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pm_reactions_post_type_id ON post_reactions (post_id, type, id DESC)');
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pm_reactions_post_id ON post_reactions (post_id, id DESC)');
            return;
        }

        Schema::table('post_reactions', function (Blueprint $table): void {
            $table->index(['post_id', 'type', 'id'], 'idx_pm_reactions_post_type_id');
            $table->index(['post_id', 'id'], 'idx_pm_reactions_post_id');
        });
    }

    // Retain the safe read index during rollback; removal requires explicit approval.
    public function down(): void
    {
    }
};
