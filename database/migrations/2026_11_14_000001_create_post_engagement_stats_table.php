<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_engagement_stats', function (Blueprint $table): void {
            $table->foreignId('post_id')->primary()->constrained('posts')->cascadeOnDelete();
            $table->unsignedBigInteger('reactions_count')->default(0);
            $table->unsignedBigInteger('comments_count')->default(0);
            foreach (['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'] as $type) {
                $table->unsignedBigInteger($type.'_count')->default(0);
            }
            $table->timestamp('updated_at')->nullable();
        });

        if (DB::getDriverName() === 'pgsql') {
            foreach (['reactions', 'comments', 'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'] as $type) {
                DB::statement('ALTER TABLE post_engagement_stats ADD CONSTRAINT post_engagement_'.$type.'_nonnegative CHECK ('.$type.'_count >= 0)');
            }
            DB::statement('ALTER TABLE post_engagement_stats ADD CONSTRAINT post_engagement_total_consistent CHECK (reactions_count = like_count + love_count + care_count + haha_count + wow_count + sad_count + angry_count)');
        }
    }

    public function down(): void
    {
        // Refuse a destructive migration rollback: use the engagement read/write flags instead.
        throw new RuntimeException('Engagement statistics contain data. Roll back using flags; table removal requires explicit approval.');
    }
};
