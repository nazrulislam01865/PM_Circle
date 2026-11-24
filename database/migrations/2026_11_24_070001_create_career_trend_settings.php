<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('career_trend_settings', function (Blueprint $table): void {
            $table->unsignedSmallInteger('id')->primary();
            $table->json('settings');
            $table->timestamps();
        });
        DB::table('career_trend_settings')->insert([
            'id' => 1, 'settings' => '{}', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('career_trend_settings');
    }
};
