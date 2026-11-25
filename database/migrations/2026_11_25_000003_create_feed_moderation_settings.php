<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('feed_moderation_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->boolean('hold_clean_content')->default(false);
            $table->timestamps();
        });
        DB::table('feed_moderation_settings')->insert(['id' => 1, 'hold_clean_content' => false, 'created_at' => now(), 'updated_at' => now()]);
    }
    public function down(): void
    {
        Schema::dropIfExists('feed_moderation_settings');
    }
};
