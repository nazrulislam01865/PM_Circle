<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->boolean('in_app')->default(true);
            $table->timestamp('email_due_at')->nullable();
            $table->string('email_status', 20)->nullable();
            $table->index(['email_status', 'email_due_at', 'notifiable_id'], 'notifications_email_due_index');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex('notifications_email_due_index');
            $table->dropColumn(['in_app', 'email_due_at', 'email_status']);
        });
    }
};
