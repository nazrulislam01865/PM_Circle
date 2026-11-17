<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_challenge_settings', function (Blueprint $table): void {
            $table->unsignedBigInteger('id')->primary();
            $table->boolean('enabled')->default(false);
            $table->boolean('auto_publish')->default(false);
            $table->boolean('auto_review')->default(false);
            $table->string('publish_time', 5)->default('08:00');
            $table->unsignedSmallInteger('expiry_hours')->default(24);
            $table->unsignedSmallInteger('max_reviews_per_user_daily')->default(10);
            $table->timestamps();
        });
        DB::table('daily_challenge_settings')->insert([
            'id' => 1, 'enabled' => false, 'auto_publish' => false, 'auto_review' => false,
            'publish_time' => '08:00', 'expiry_hours' => 24,
            'max_reviews_per_user_daily' => 10, 'created_at' => now(), 'updated_at' => now(),
        ]);
        Schema::table('ai_editorial_drafts', function (Blueprint $table): void {
            $table->unsignedTinyInteger('generation_attempts')->default(0);
        });
        Schema::table('scenarios', function (Blueprint $table): void {
            $table->timestamp('expires_at')->nullable()->index();
            $table->string('daily_slot', 30)->nullable()->unique();
        });
        Schema::table('scenario_responses', function (Blueprint $table): void {
            $table->string('ai_review_status', 26)->nullable();
        });
        // Automated publications have no human approver; retain null instead of impersonating an admin.
        Schema::table('scenario_rubric_versions', function (Blueprint $table): void {
            $table->foreignId('approved_by')->nullable()->change();
        });
    }

    public function down(): void
    {
        // The rubric approver column deliberately remains nullable after rollback to
        // preserve legitimate system-generated rows and avoid destructive migration.
        Schema::table('scenario_responses', fn (Blueprint $table) => $table->dropColumn('ai_review_status'));
        Schema::table('scenarios', function (Blueprint $table): void {
            $table->dropUnique(['daily_slot']);
            $table->dropIndex(['expires_at']);
            $table->dropColumn(['expires_at', 'daily_slot']);
        });
        Schema::table('ai_editorial_drafts', fn (Blueprint $table) => $table->dropColumn('generation_attempts'));
        Schema::dropIfExists('daily_challenge_settings');
    }
};
