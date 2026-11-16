<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_reward_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->string('discount_type', 10)->default('percent');
            $table->decimal('discount_value', 10, 2)->default(10);
            $table->string('currency', 3)->default('BDT');
            $table->unsignedSmallInteger('validity_days')->default(5);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('profile_completion_rewards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('code', 40)->unique();
            $table->string('discount_type', 10);
            $table->decimal('discount_value', 10, 2);
            $table->string('currency', 3);
            $table->unsignedSmallInteger('validity_days');
            $table->timestampTz('expires_at');
            $table->timestampTz('redeemed_at')->nullable();
            $table->string('redemption_reference', 120)->nullable()->unique();
            $table->timestamps();
            $table->index(['expires_at', 'redeemed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_completion_rewards');
        Schema::dropIfExists('profile_reward_settings');
    }
};
