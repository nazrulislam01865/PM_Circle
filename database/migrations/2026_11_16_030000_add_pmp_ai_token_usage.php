<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_chat_limit_policies', function (Blueprint $table): void {
            $table->unsignedInteger('max_cycle_tokens')->nullable();
        });
        Schema::table('ai_chat_user_overrides', function (Blueprint $table): void {
            $table->unsignedInteger('max_cycle_tokens')->nullable();
        });
        Schema::table('ai_chat_usage_buckets', function (Blueprint $table): void {
            $table->unsignedBigInteger('used_tokens')->default(0);
            $table->unsignedBigInteger('reserved_tokens')->default(0);
        });
        Schema::create('ai_pmp_token_allocations', function (Blueprint $table): void {
            $table->foreignId('request_id')->primary()->constrained('ai_requests')->cascadeOnDelete();
            $table->foreignId('bucket_id')->constrained('ai_chat_usage_buckets')->restrictOnDelete();
            $table->unsignedInteger('reserved_tokens');
            $table->unsignedInteger('actual_tokens')->default(0);
            $table->string('state', 20)->default('reserved');
            $table->timestamps();
        });
        Schema::create('ai_pmp_token_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('request_id')->constrained('ai_requests')->cascadeOnDelete();
            $table->foreignId('bucket_id')->constrained('ai_chat_usage_buckets')->restrictOnDelete();
            $table->string('kind', 16);
            $table->integer('reserved_delta');
            $table->integer('used_delta');
            $table->timestamp('created_at');
            $table->unique(['request_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_pmp_token_events');
        Schema::dropIfExists('ai_pmp_token_allocations');
        Schema::table('ai_chat_usage_buckets', function (Blueprint $table): void {
            $table->dropColumn(['used_tokens', 'reserved_tokens']);
        });
        Schema::table('ai_chat_user_overrides', fn (Blueprint $table) => $table->dropColumn('max_cycle_tokens'));
        Schema::table('ai_chat_limit_policies', fn (Blueprint $table) => $table->dropColumn('max_cycle_tokens'));
    }
};
