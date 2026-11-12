<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('member_profile_views', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('profile_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('viewer_id')->constrained('users')->cascadeOnDelete();
            $table->date('viewed_on');
            $table->timestamp('created_at');
            // Count each signed-in member at most once per calendar day.
            $table->unique(['profile_user_id', 'viewer_id', 'viewed_on'], 'member_profile_views_daily_unique');
            $table->index(['profile_user_id', 'viewed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_profile_views');
    }
};
