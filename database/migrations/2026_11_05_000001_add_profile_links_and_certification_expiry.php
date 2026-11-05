<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->string('linkedin_url', 500)->nullable();
            $table->json('languages')->nullable();
        });

        Schema::table('certifications', function (Blueprint $table) {
            $table->string('valid_until', 20)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('certifications', fn (Blueprint $table) => $table->dropColumn('valid_until'));
        Schema::table('profiles', fn (Blueprint $table) => $table->dropColumn(['linkedin_url', 'languages']));
    }
};
