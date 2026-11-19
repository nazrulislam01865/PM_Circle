<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type', 80);
            $table->morphs('notifiable');
            $table->string('event_key', 160);
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['notifiable_type', 'notifiable_id', 'event_key'], 'member_notifications_event_unique');
            $table->index(['notifiable_type', 'notifiable_id', 'read_at'], 'member_notifications_unread_index');
            $table->index(['notifiable_type', 'notifiable_id', 'created_at', 'id'], 'member_notifications_feed_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
