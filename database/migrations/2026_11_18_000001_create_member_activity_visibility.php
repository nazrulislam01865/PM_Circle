<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // PostgreSQL indexes on existing large tables must not block normal writes.
    public $withinTransaction = false;

    public function up(): void
    {
        Schema::create('member_activity_visibility', function (Blueprint $table): void {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->timestamp('hidden_before');
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_comments_member_time_idx ON comments (author_id, created_at DESC, id DESC) WHERE deleted_at IS NULL');
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_scenarios_member_time_idx ON scenario_responses (user_id, created_at DESC, id DESC)');
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_learning_member_time_idx ON learning_activity_completions (user_id, completed_at DESC, id DESC)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('member_activity_visibility');
        // Keep additive read indexes to avoid a blocking production rollback.
    }
};
