<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->string('phone', 32)->nullable();
        });

        Schema::table('profile_import_sessions', function (Blueprint $table): void {
            $table->foreignId('profile_resume_id')->nullable()->constrained('profile_resumes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('profile_import_sessions', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('profile_resume_id');
        });
        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn('phone');
        });
    }
};
