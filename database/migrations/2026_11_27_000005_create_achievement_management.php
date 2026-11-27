<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('achievement_badges', function (Blueprint $table): void {
            $table->string('id', 64)->primary();
            $table->json('definition');
            $table->string('status', 12);
            $table->unsignedInteger('position');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        Schema::create('achievement_work_aliases', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 180);
            $table->string('source', 160);
            $table->timestamps();
        });
        Schema::create('achievement_awards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('badge_id', 64);
            $table->foreign('badge_id')->references('id')->on('achievement_badges')->restrictOnDelete();
            $table->json('snapshot');
            $table->timestamp('earned_at')->nullable();
            $table->timestamp('created_at');
            $table->timestamp('revoked_at')->nullable();
            $table->text('revocation_reason')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unique(['user_id', 'badge_id']);
            $table->index(['badge_id', 'revoked_at']);
        });
        $supported = ['courses', 'certificates', 'exams', 'pmpExams', 'challenges', 'posts', 'replies', 'interviews', 'profile', 'minutes'];
        foreach (config('achievements.badges') as $index => $badge) {
            DB::table('achievement_badges')->insert([
                'id' => $badge['id'], 'definition' => json_encode([...$badge, 'mode' => 'milestone', 'art' => $badge['metric'], 'targets' => [], 'match' => 'all', 'required' => 1, 'description' => '', 'artwork' => null], JSON_THROW_ON_ERROR),
                'status' => in_array($badge['metric'], $supported, true) ? 'active' : 'paused',
                'position' => $index + 1, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('achievement_awards');
        Schema::dropIfExists('achievement_work_aliases');
        Schema::dropIfExists('achievement_badges');
    }
};
