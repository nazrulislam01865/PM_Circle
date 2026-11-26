<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_editorial_drafts', function (Blueprint $table): void {
            $table->boolean('archive_recovery')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('ai_editorial_drafts', fn (Blueprint $table) => $table->dropColumn('archive_recovery'));
    }
};
