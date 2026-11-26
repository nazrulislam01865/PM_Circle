<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('interview_sessions', function (Blueprint $table) {
            $table->string('profession', 100)->nullable();
            $table->string('requested_experience', 120)->nullable();
            $table->json('target_labels')->nullable();
        });
    }
    public function down(): void
    {
        Schema::table('interview_sessions', fn (Blueprint $table) => $table->dropColumn(['profession', 'requested_experience', 'target_labels']));
    }
};
