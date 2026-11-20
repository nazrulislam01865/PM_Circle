<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Non-destructive: all existing counters and reaction rows remain unchanged.
        Schema::table('post_engagement_stats', function (Blueprint $table): void {
            $table->unsignedBigInteger('other_reactions_count')->default(0);
        });

        if (DB::getDriverName() === 'pgsql') {
            // Replace only the consistency definition; preserve every row and its counts.
            DB::statement('ALTER TABLE post_engagement_stats DROP CONSTRAINT post_engagement_total_consistent');
            DB::statement('ALTER TABLE post_engagement_stats ADD CONSTRAINT post_engagement_other_reactions_nonnegative CHECK (other_reactions_count >= 0)');
            DB::statement('ALTER TABLE post_engagement_stats ADD CONSTRAINT post_engagement_total_consistent CHECK (reactions_count = like_count + love_count + care_count + haha_count + wow_count + sad_count + angry_count + other_reactions_count)');
        }
    }

    public function down(): void
    {
        // Do not risk losing custom reaction counts in a production rollback.
        throw new RuntimeException('Custom reaction counters may contain data; rollback requires an explicit data-safe migration.');
    }
};
