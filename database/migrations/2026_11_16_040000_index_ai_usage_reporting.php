<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Thirty-day admin aggregates filter by date rather than member_id.
        Schema::table('ai_requests', function (Blueprint $table): void {
            $table->index('created_at', 'ai_requests_created_at_reporting_idx');
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table): void {
            $table->dropIndex('ai_requests_created_at_reporting_idx');
        });
    }
};
