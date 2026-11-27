<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table): void {
            $table->boolean('signup_visible')->default(true);
            $table->string('signup_badge', 40)->nullable();
        });
        DB::table('plans')->where('code', 'plus')->update(['signup_badge' => 'Recommended']);
        DB::table('plans')->where('code', 'pro')->update(['signup_badge' => 'Suggested plan']);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table): void {
            $table->dropColumn(['signup_visible', 'signup_badge']);
        });
    }
};
