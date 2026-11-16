<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_requests', static function (Blueprint $table): void {
            $table->index(['conversation_id', 'status', 'id'], 'ai_request_conversation_status_idx');
        });
        Schema::table('ai_messages', static function (Blueprint $table): void {
            $table->index(['conversation_id', 'id'], 'ai_messages_conversation_latest_idx');
        });
    }

    public function down(): void
    {
        Schema::table('ai_messages', static function (Blueprint $table): void {
            $table->dropIndex('ai_messages_conversation_latest_idx');
        });
        Schema::table('ai_requests', static function (Blueprint $table): void {
            $table->dropIndex('ai_request_conversation_status_idx');
        });
    }
};
