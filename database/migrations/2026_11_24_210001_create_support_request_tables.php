<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('support_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('topic', 80);
            $table->string('subject', 100);
            $table->text('details');
            $table->string('status', 20)->default('open');
            $table->string('screenshot_path')->nullable();
            $table->uuid('submission_key');
            $table->timestamps();
            $table->unique(['user_id', 'submission_key']);
            $table->index(['user_id', 'updated_at']);
            $table->index(['status', 'updated_at']);
        });
        Schema::create('support_request_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_staff');
            $table->text('body');
            $table->uuid('submission_key')->nullable();
            $table->timestamps();
            $table->index(['support_request_id', 'id']);
            $table->unique(['support_request_id', 'submission_key'], 'support_reply_submission_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_request_replies');
        Schema::dropIfExists('support_requests');
    }
};
